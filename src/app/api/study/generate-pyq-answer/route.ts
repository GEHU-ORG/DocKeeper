import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/lib/mongoose';
import { PyqAnswer } from '@/models/PyqAnswer';

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const ORG = 'UniExamPrep';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = ((session.user as any).githubUsername ?? session.user.email ?? 'anonymous') as string;

  const { repo, subjectPath, pdfFile } = await req.json();
  if (!repo || !subjectPath || !pdfFile) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

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

  // 2. Generate with Gemini
  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `You are a university exam solver. Analyze the provided Past Year Question (PYQ) paper PDF.
  
Extract all the questions present in the paper, and then write a comprehensive, detailed answer for each question as if it were a 10-mark long-answer university question.

Format your response in beautiful Markdown.
For each question:
### Q: [The extracted question text]
**Answer:**
[Your detailed 10-mark answer with explanations, bullet points, and examples where applicable]
---
`;

  let generatedText: string;
  try {
    const result = await model.generateContent([prompt, { inlineData }]);
    generatedText = result.response.text().trim();
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
