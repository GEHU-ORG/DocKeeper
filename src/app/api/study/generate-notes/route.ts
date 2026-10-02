import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/lib/mongoose';
import { Chat } from '@/models/Chat';

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const ORG = 'UniExamPrep';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = ((session.user as any).githubUsername ?? session.user.email ?? 'anonymous') as string;

  const { repo, subjectPath, subjectName, selectedFiles } = await req.json();
  if (!repo || !subjectPath || !selectedFiles?.length) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  // 1. Fetch PDF content from GitHub (base64)
  const pdfParts: { inlineData: { data: string; mimeType: string } }[] = [];
  for (const file of selectedFiles.slice(0, 5)) { // max 5 files to stay within limits
    try {
      const { data: blob } = await octokit.git.getBlob({
        owner: ORG, repo: file.repo || repo, file_sha: file.sha,
      });
      pdfParts.push({
        inlineData: { data: blob.content.replace(/\n/g, ''), mimeType: 'application/pdf' },
      });
    } catch { /* skip unreadable */ }
  }

  if (pdfParts.length === 0) {
    return NextResponse.json({ error: 'Could not read any PDF files' }, { status: 400 });
  }

  // 2. Generate with Gemini
  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `You are a university exam study assistant. Analyze the provided documents for the subject "${subjectName}" and generate comprehensive pre-processed study notes.

Format your response in beautiful Markdown with clear headings. Include:
1. **Subject Overview:** Brief overview in 2-3 sentences.
2. **Key Concepts:** 5-8 key concepts with detailed explanations.
3. **Likely Exam Questions:** 5-8 Q&As based on important topics.
4. **PYQ Solutions (if applicable):** Any past year questions found in the documents along with your solved answers.
5. **Study Tips:** 3-5 memory tips or important formulas.

Focus entirely on exam-relevant content.`;

  let generatedText: string;
  try {
    const result = await model.generateContent([prompt, ...pdfParts]);
    generatedText = result.response.text().trim();
  } catch (e: any) {
    return NextResponse.json({ error: `AI generation failed: ${e.message}` }, { status: 500 });
  }

  // 3. Save to MongoDB
  await dbConnect();
  
  try {
    const chat = await Chat.create({
      userId,
      subjectPath,
      title: `Study Notes: ${subjectName}`,
      messages: [
        {
          role: 'assistant',
          content: generatedText
        }
      ]
    });

    return NextResponse.json({
      success: true,
      chatId: chat._id,
      content: generatedText,
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Failed to save to database: ${e.message}` }, { status: 500 });
  }
}

