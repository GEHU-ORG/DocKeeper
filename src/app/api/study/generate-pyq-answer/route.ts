export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/lib/mongoose';
import { PyqAnswer } from '@/models/PyqAnswer';
import { prisma } from '@/lib/prisma';

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
const ORG = 'UniExamPrep';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = ((session.user as any).githubUsername ?? session.user.email ?? 'anonymous') as string;

  const { repo, subjectPath, pdfFile } = await req.json();
  if (!repo || !subjectPath || !pdfFile) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  // Get User's Custom API Key (if any)
  let apiKey = process.env.GEMINI_API_KEY!;
  let isPublic = true;
  let customModel = 'gemini-2.5-flash';

  if (session.user.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { geminiApiKey: true, geminiModel: true },
    });
    if (dbUser?.geminiApiKey) {
      apiKey = dbUser.geminiApiKey;
      isPublic = false; // Private if using their own key
      if (dbUser.geminiModel) customModel = dbUser.geminiModel;
    }
  }

  const customGenai = new GoogleGenerativeAI(apiKey);

  // 1. Fetch PDF content from GitHub (base64)
  let inlineData: { data: string; mimeType: string };
  try {
    const { data: blob } = await octokit.git.getBlob({
      owner: ORG, repo: pdfFile.repo || repo, file_sha: pdfFile.sha,
    });
    inlineData = { data: blob.content.replace(/\n/g, ''), mimeType: 'application/pdf' };
  } catch (e: any) {
    return NextResponse.json({ error: `Could not read PDF: ${e.message}` }, { status: 400 });
  }

  // 2. Generate with Gemini - Parallel Processing for Speed
  const model = customGenai.getGenerativeModel({ model: customModel });
  
  let generatedText: string = "";
  try {
    // Step A: Extract all questions as a JSON array
    const extractPrompt = `Analyze the provided Past Year Question (PYQ) paper PDF. Extract all the major questions along with their assigned marks if visible (e.g., "(5 marks)", "[2]").
Return ONLY a raw valid JSON array of strings, where each string contains the question text and its marks. Do not include markdown formatting like \`\`\`json.
Example: ["What is an operating system? (2 Marks)", "Explain the OSI model with a diagram. (10 Marks)"]`;

    const extractResult = await model.generateContent([extractPrompt, { inlineData }]);
    const rawText = extractResult.response.text().trim();
    const jsonStr = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    
    let questions: string[] = [];
    try {
      questions = JSON.parse(jsonStr);
    } catch (parseErr) {
      // Fallback if parsing fails or no questions found
      console.error("Failed to parse extracted questions:", jsonStr);
      questions = ["Please provide a detailed solution for every question found in this paper."];
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      questions = ["Please provide a detailed solution for every question found in this paper."];
    }

    // Limit to max 15 questions to prevent overwhelming the API
    const safeQuestions = questions.slice(0, 15);

    // Step B: Process each question in parallel
    const promises = safeQuestions.map(async (q, index) => {
      const qPrompt = `You are a university exam solver. A student has asked you to solve the following question from the provided exam paper PDF:
      
Question: "${q}"

Write an answer that is appropriate in length and depth for the marks assigned to this question (e.g., brief and concise for 2 marks, detailed with explanations/diagrams for 10 marks). If no marks are visible, provide a comprehensive standard answer.
Include bullet points and examples where applicable.
Format your answer in Markdown, without repeating the question as a header (I will add the header).
Rely on the provided PDF for any necessary context (like figures or specific paper instructions).`;

      try {
        const res = await model.generateContent([qPrompt, { inlineData }]);
        return `### Q${index + 1}: ${q}\n\n**Answer:**\n\n${res.response.text().trim()}\n\n---\n`;
      } catch (err) {
        return `### Q${index + 1}: ${q}\n\n**Answer:**\n\nFailed to generate answer for this question.\n\n---\n`;
      }
    });

    const answers = await Promise.all(promises);
    generatedText = `# PYQ Solutions for ${pdfFile.name}\n\n${answers.join('\n')}`;

  } catch (e: any) {
    return NextResponse.json({ error: `AI generation failed: ${e.message}` }, { status: 500 });
  }

  // 3. Save to MongoDB
  await dbConnect();
  
  try {
    const answer = await PyqAnswer.create({
      userId,
      subjectPath,
      pdfUrl: pdfFile.url || pdfFile.path,
      pdfName: pdfFile.name,
      content: generatedText,
      isPublic,
    });

    return NextResponse.json({
      success: true,
      answerId: answer._id,
      content: generatedText,
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Failed to save to database: ${e.message}` }, { status: 500 });
  }
}
