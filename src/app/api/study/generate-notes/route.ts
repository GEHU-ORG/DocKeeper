import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const ORG = 'UniExamPrep';

/**
 * POST /api/study/generate-notes
 * Body: { repo, subjectPath, subjectName, selectedFiles: [{ path, sha, repo }] }
 * 
 * 1. Fetches selected PDF blobs from GitHub
 * 2. Sends to Gemini to generate structured study notes
 * 3. Saves as .chat JSON to .private/{userId}/{subjectPath}/StudyNotes/{timestamp}.chat
 * 4. Returns the generated content
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { repo, subjectPath, subjectName, selectedFiles } = await req.json();
  if (!repo || !subjectPath || !selectedFiles?.length) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const userId = session.user.id;

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
  const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `You are a university exam study assistant. Analyze the provided documents for the subject "${subjectName}" and generate comprehensive pre-processed study notes.

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "subject": "${subjectName}",
  "sections": [
    { "type": "overview", "content": "Brief subject overview in 2-3 sentences" },
    { "type": "concept", "title": "Concept Name", "content": "Explanation" },
    { "type": "qa", "question": "Exam question", "answer": "Detailed answer" },
    { "type": "pyq", "year": "2024", "question": "Past year question", "answer": "Answer" },
    { "type": "tip", "content": "Memory tip or important formula" }
  ]
}

Include: 1 overview, 5-8 key concepts, 5-8 Q&As from likely exam questions, all PYQ questions with answers found in the documents, and 3-5 study tips. Focus on exam-relevant content.`;

  let generatedContent: any;
  try {
    const result = await model.generateContent([prompt, ...pdfParts]);
    const text = result.response.text().trim();
    // Strip markdown code fences if present
    const jsonText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    generatedContent = JSON.parse(jsonText);
  } catch (e: any) {
    return NextResponse.json({ error: `AI generation failed: ${e.message}` }, { status: 500 });
  }

  // 3. Save to GitHub as .chat file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `${timestamp}.chat`;
  const privatePath = `.private/${userId}/${subjectPath}/StudyNotes/${fileName}`;

  const chatContent = {
    subject: subjectName,
    generatedAt: new Date().toISOString(),
    model: 'gemini-1.5-flash',
    sourceFiles: selectedFiles.map((f: any) => f.name),
    ...generatedContent,
  };

  const fileContent = Buffer.from(JSON.stringify(chatContent, null, 2)).toString('base64');

  try {
    // Check if file exists (to update vs create)
    let sha: string | undefined;
    try {
      const { data: existing } = await octokit.repos.getContent({ owner: ORG, repo, path: privatePath });
      if ('sha' in existing) sha = existing.sha;
    } catch { /* doesn't exist */ }

    await octokit.repos.createOrUpdateFileContents({
      owner: ORG, repo, path: privatePath,
      message: `Study notes: ${subjectName} (${timestamp})`,
      content: fileContent,
      ...(sha ? { sha } : {}),
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Failed to save: ${e.message}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    fileName,
    path: privatePath,
    content: chatContent,
  });
}
