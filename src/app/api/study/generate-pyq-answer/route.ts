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

  const body = await req.json();
  const { action } = body;

  if (action === 'extract') {
    return handleExtract(userId, session, body);
  } else if (action === 'solve') {
    return handleSolve(userId, session, body);
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function handleExtract(userId: string, session: any, { repo, subjectPath, pdfFile }: any) {
  if (!repo || !subjectPath || !pdfFile) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  let apiKey = process.env.GEMINI_API_KEY!;
  let isPublic = true;
  let customModel = 'gemini-2.5-flash';

  if (session.user.email) {
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { geminiApiKey: true, geminiModel: true } });
    if (dbUser?.geminiApiKey) {
      apiKey = dbUser.geminiApiKey;
      isPublic = false;
      if (dbUser.geminiModel) customModel = dbUser.geminiModel;
    }
  }

  const customGenai = new GoogleGenerativeAI(apiKey);

  let inlineData: { data: string; mimeType: string };
  try {
    const { data: blob } = await octokit.git.getBlob({ owner: ORG, repo: pdfFile.repo || repo, file_sha: pdfFile.sha });
    inlineData = { data: blob.content.replace(/\n/g, ''), mimeType: 'application/pdf' };
  } catch (e: any) {
    return NextResponse.json({ error: `Could not read PDF: ${e.message}` }, { status: 400 });
  }

  const model = customGenai.getGenerativeModel({ model: customModel });
  
  try {
    const extractPrompt = `Analyze the provided Past Year Question (PYQ) paper PDF. Extract all the major questions along with their assigned marks if visible (e.g., "(5 marks)", "[2]").
Return ONLY a raw valid JSON array of objects. Each object must have "questionText" (string) and "marks" (string, optional). Do not include markdown formatting like \`\`\`json.
Example: [{"questionText": "What is an operating system?", "marks": "2 Marks"}, {"questionText": "Explain the OSI model.", "marks": "10 Marks"}]`;

    const extractResult = await model.generateContent([extractPrompt, { inlineData }]);
    const rawText = extractResult.response.text().trim();
    const jsonStr = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    
    let questions = [];
    try {
      questions = JSON.parse(jsonStr);
      if (!Array.isArray(questions)) throw new Error('Not an array');
    } catch {
      questions = [{ questionText: "Please provide a detailed solution for every question found in this paper.", marks: "" }];
    }

    const formattedQuestions = questions.slice(0, 15).map(q => ({
      questionText: q.questionText || q,
      marks: q.marks || "",
      answer: "",
      isSolved: false
    }));

    await dbConnect();
    const answer = await PyqAnswer.create({
      userId,
      subjectPath,
      pdfUrl: pdfFile.url || pdfFile.path,
      pdfName: pdfFile.name,
      questions: formattedQuestions,
      isPublic,
    });

    return NextResponse.json({ success: true, answerId: answer._id, questions: answer.questions });
  } catch (e: any) {
    return NextResponse.json({ error: `AI extraction failed: ${e.message}` }, { status: 500 });
  }
}

async function handleSolve(userId: string, session: any, { answerId, questionId, repo, pdfFile }: any) {
  if (!answerId || !questionId || !repo || !pdfFile) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  await dbConnect();
  const dbAnswer = await PyqAnswer.findById(answerId);
  if (!dbAnswer) return NextResponse.json({ error: 'Answer not found' }, { status: 404 });

  const question = dbAnswer.questions.id(questionId);
  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

  let apiKey = process.env.GEMINI_API_KEY!;
  let customModel = 'gemini-2.5-flash';

  if (session.user.email) {
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { geminiApiKey: true, geminiModel: true } });
    if (dbUser?.geminiApiKey) {
      apiKey = dbUser.geminiApiKey;
      if (dbUser.geminiModel) customModel = dbUser.geminiModel;
    }
  }

  const customGenai = new GoogleGenerativeAI(apiKey);

  let inlineData: { data: string; mimeType: string };
  try {
    const { data: blob } = await octokit.git.getBlob({ owner: ORG, repo: pdfFile.repo || repo, file_sha: pdfFile.sha });
    inlineData = { data: blob.content.replace(/\n/g, ''), mimeType: 'application/pdf' };
  } catch (e: any) {
    return NextResponse.json({ error: `Could not read PDF: ${e.message}` }, { status: 400 });
  }

  const model = customGenai.getGenerativeModel({ model: customModel });
  
  const qPrompt = `You are a university exam solver. A student has asked you to solve the following question from the provided exam paper PDF:
Question: "${question.questionText}" ${question.marks ? `(${question.marks})` : ''}

Write an answer that is appropriate in length and depth for the marks assigned. If no marks are visible, provide a comprehensive standard answer.
Include bullet points and examples where applicable. Format your answer in Markdown.
Rely on the provided PDF for any necessary context (like figures or specific paper instructions).`;

  try {
    const res = await model.generateContent([qPrompt, { inlineData }]);
    question.answer = res.response.text().trim();
    question.isSolved = true;
    await dbAnswer.save();

    return NextResponse.json({ success: true, answer: question.answer });
  } catch (e: any) {
    return NextResponse.json({ error: `AI generation failed: ${e.message}` }, { status: 500 });
  }
}
