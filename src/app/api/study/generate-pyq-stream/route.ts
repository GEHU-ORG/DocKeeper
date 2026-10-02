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
      isPublic = false;
      if (dbUser.geminiModel) customModel = dbUser.geminiModel;
    }
  }

  const customGenai = new GoogleGenerativeAI(apiKey);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        sendEvent('status', { message: 'Reading PDF from repository...' });
        const { data: blob } = await octokit.git.getBlob({
          owner: ORG, repo: pdfFile.repo || repo, file_sha: pdfFile.sha,
        });
        const inlineData = { data: blob.content.replace(/\n/g, ''), mimeType: 'application/pdf' };

        const model = customGenai.getGenerativeModel({ model: customModel });
        
        sendEvent('status', { message: 'Extracting questions and marks from the paper...' });
        
        const extractPrompt = `Analyze the provided Past Year Question (PYQ) paper PDF. Extract all the major questions along with their assigned marks if visible (e.g., "(5 marks)", "[2]").
Return ONLY a raw valid JSON array of objects, where each object contains the question text and its marks. Do not include markdown formatting like \`\`\`json.
Example: [{"q": "What is an operating system?", "marks": 2}, {"q": "Explain the OSI model with a diagram.", "marks": 10}]`;

        const extractResult = await model.generateContent([extractPrompt, { inlineData }]);
        const rawText = extractResult.response.text().trim();
        const jsonStr = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        
        let questions: any[] = [];
        try {
          questions = JSON.parse(jsonStr);
        } catch (parseErr) {
          questions = [{ q: "Please provide a detailed solution for every question found in this paper.", marks: null }];
        }

        if (!Array.isArray(questions) || questions.length === 0) {
          questions = [{ q: "Please provide a detailed solution for every question found in this paper.", marks: null }];
        }

        const safeQuestions = questions.slice(0, 15);
        sendEvent('questions', { count: safeQuestions.length });
        sendEvent('status', { message: `Solving ${safeQuestions.length} questions...` });

        // Stream header
        let fullMarkdown = `# PYQ Solutions for ${pdfFile.name}\n\n`;
        sendEvent('chunk', { text: fullMarkdown });

        // Process sequentially to allow true streaming to UI (ChatGPT style)
        for (let index = 0; index < safeQuestions.length; index++) {
          const item = safeQuestions[index];
          const qText = typeof item === 'string' ? item : (item.q || 'Unknown question');
          const marks = typeof item === 'object' ? item.marks : null;
          
          const marksText = marks ? `\nThis question is worth ${marks} marks. Answer accordingly with appropriate length and depth.` : '';
          const qPrompt = `You are a university exam solver. A student has asked you to solve the following question from the provided exam paper PDF:
          
Question: "${qText}"

Write an answer that is appropriate in length and depth for the marks assigned to this question (e.g., brief and concise for 2 marks, detailed with explanations/diagrams for 10 marks). If no marks are visible, provide a comprehensive standard answer.
Include bullet points and examples where applicable.${marksText}
Format your answer in Markdown, without repeating the question as a header (I will add the header).
Rely on the provided PDF for any necessary context (like figures or specific paper instructions).`;

          let chunkText = `### Q${index + 1}: ${qText}\n**[${marks ? marks + ' Marks' : 'Marks not specified'}]**\n\n**Answer:**\n\n`;
          sendEvent('chunk', { text: chunkText });
          fullMarkdown += chunkText;

          try {
            // Use streaming generation for ChatGPT style effect
            const resultStream = await model.generateContentStream([qPrompt, { inlineData }]);
            for await (const chunk of resultStream.stream) {
              const chunkText = chunk.text();
              sendEvent('chunk', { text: chunkText });
              fullMarkdown += chunkText;
            }
            sendEvent('chunk', { text: '\n\n---\n\n' });
            fullMarkdown += '\n\n---\n\n';
          } catch (err) {
            const errText = `Failed to generate answer for this question.\n\n---\n\n`;
            sendEvent('chunk', { text: errText });
            fullMarkdown += errText;
          }
        }

        sendEvent('status', { message: 'Saving answers to database...' });
        
        await dbConnect();
        const answer = await PyqAnswer.create({
          userId,
          subjectPath,
          pdfUrl: pdfFile.url || pdfFile.path,
          pdfName: pdfFile.name,
          content: fullMarkdown,
          isPublic,
        });

        sendEvent('complete', { answerId: answer._id, isPublic });
      } catch (e: any) {
        sendEvent('error', { error: `AI generation failed: ${e.message}` });
      } finally {
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
