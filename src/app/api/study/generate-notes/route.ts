import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/lib/mongoose';
import { Chat } from '@/models/Chat';
import { prisma } from '@/lib/prisma';

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
const ORG = 'UniExamPrep';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = ((session.user as any).githubUsername ?? session.user.email ?? 'anonymous') as string;

  const { repo, subjectPath, subjectName, selectedFiles, noteType } = await req.json();
  if (!repo || !subjectPath || !selectedFiles?.length) {
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
  const model = customGenai.getGenerativeModel({ model: customModel });
  
  let prompt = '';
  if (noteType === '1-pager') {
    prompt = `You are an expert university exam study assistant. Analyze the provided documents (which may include Syllabus, PYQs, and Notes) for the subject "${subjectName}" and generate a highly effective 1-Pager revision sheet.

CRITICAL INSTRUCTIONS:
- You MUST format your response in beautiful, fully complete Markdown.
- GitHub natively renders Mermaid diagrams. You MUST include at least one visual flowchart, mindmap, or architecture diagram using \`\`\`mermaid syntax!
- NEVER leave a table empty. ALWAYS populate the table with the most important topics found in the documents.
- If you cannot determine frequency from PYQs, estimate importance based on the depth of coverage in the notes.
- Use emojis liberally to make it visually engaging and readable.

Include the following sections strictly:
1. **🌟 Subject Overview:** Brief overview in 2-3 sentences.
2. **🔥 Important Topics Frequency Table:** Use a fully formatted Markdown table with columns: | Topic | Frequency (High/Medium/Low) | Key Concepts | Predicted for Next Exam? (Yes/No) |
   -> You MUST provide at least 5 rows in this table.
3. **📊 Concept Mindmap / Flowchart:** Use \`\`\`mermaid syntax to draw a beautiful mindmap or flowchart connecting the core concepts of this subject.
4. **🧠 Must-Know Concepts:** Briefly summarize the 5 most critical concepts.
5. **⚡ Cheat Sheet / Formulas:** Critical formulas, definitions, or memory aids (mnemonics) to memorize before the exam.

Keep this strictly to a highly condensed, beautiful, exam-focused 1-pager format that will look amazing on GitHub.`;
  } else {
    prompt = `You are a university exam study assistant. Analyze the provided documents (Syllabus, PYQs, and Notes) for the subject "${subjectName}" and generate comprehensive pre-processed study notes covering EVERY topic found in the syllabus and materials.

CRITICAL INSTRUCTIONS:
- You MUST aggressively reorganize and order the content based on IMPORTANCE. The most important, high-frequency topics (based on PYQs and syllabus weightage) MUST appear first.
- Mark highly important topics clearly using visually distinct icons (e.g., 🔴 HIGH IMPORTANCE, 🌟, or ⚠️).
- Format your response in beautiful Markdown with clear headings.

Include:
1. **Subject Overview:** Brief overview in 2-3 sentences.
2. **Comprehensive Topic Breakdown (Sorted by Importance):** For every topic identified, provide a detailed explanation, key points, and examples. The most frequently asked exam topics must be placed at the very top of this section and explicitly marked as important.
3. **Likely Exam Questions:** 10+ Q&As covering the entire syllabus, prioritizing the most important ones.
4. **PYQ Solutions (if applicable):** Any past year questions found in the documents along with your solved answers.
5. **Study Tips:** Memory tips or important formulas.

Do not skip any major topics, but strictly arrange them so the student learns the highest-yield exam topics first.`;
  }

  let generatedText: string;
  try {
    const result = await model.generateContent([prompt, ...pdfParts]);
    generatedText = result.response.text().trim();
  } catch (e: any) {
    return NextResponse.json({ error: `AI generation failed: ${e.message}` }, { status: 500 });
  }

  // 3. Save to MongoDB
  await dbConnect();
  
  let chatId;
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
      ],
      isPublic,
    });
    chatId = chat._id;
  } catch (e: any) {
    return NextResponse.json({ error: `Failed to save to database: ${e.message}` }, { status: 500 });
  }

  // 4. Upload to GitHub as a .md file!
  try {
    const fileName = noteType === '1-pager' ? '1-Pager_CheatSheet.md' : 'Comprehensive_Notes.md';
    const filePath = `${subjectPath}/Notes/${fileName}`;
    const fileContent = Buffer.from(generatedText).toString('base64');
    
    // Check if file exists to get SHA for updating
    let fileSha = undefined;
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: ORG,
        repo: repo,
        path: filePath,
      });
      if (!Array.isArray(fileData)) {
        fileSha = fileData.sha;
      }
    } catch (e) {
      // File doesn't exist, which is fine
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: ORG,
      repo: repo,
      path: filePath,
      message: `DocsKeeper AI: Generated ${fileName}`,
      content: fileContent,
      sha: fileSha,
    });

  } catch (e: any) {
    console.error("Failed to upload to GitHub", e);
    // We don't fail the request if GitHub upload fails, just log it.
  }

  return NextResponse.json({
    success: true,
    chatId: chatId,
    content: generatedText,
  });
}

