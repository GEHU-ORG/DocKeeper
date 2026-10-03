export const maxDuration = 60;

import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/lib/mongoose';
import { Chat } from '@/models/Chat';
import { prisma } from '@/lib/prisma';
import { ImageResponse } from 'next/og';

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

  let apiKey = process.env.GEMINI_API_KEY!;
  let isPublic = true;
  let customModel = 'gemini-3.1-flash-lite';

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
  const pdfParts: { inlineData: { data: string; mimeType: string } }[] = [];
  for (const file of selectedFiles.slice(0, 5)) {
    try {
      const { data: blob } = await octokit.git.getBlob({
        owner: ORG, repo: file.repo || repo, file_sha: file.sha,
      });
      pdfParts.push({
        inlineData: { data: blob.content.replace(/\n/g, ''), mimeType: 'application/pdf' },
      });
    } catch { /* skip */ }
  }

  if (pdfParts.length === 0) {
    return NextResponse.json({ error: 'Could not read any PDF files' }, { status: 400 });
  }

  const model = customGenai.getGenerativeModel({ model: customModel });
  
  // ==========================================
  // IMAGE GENERATION (1-PAGER)
  // ==========================================
  if (noteType === '1-pager') {
    const prompt = `You are a visual design assistant. Analyze the provided study materials for "${subjectName}".
You MUST extract the core concepts and output ONLY a raw JSON object (no markdown, no backticks).
Format:
{
  "title": "Cheat Sheet: ${subjectName}",
  "overview": "A brief 2 sentence overview of the entire subject.",
  "cards": [
    { "title": "Topic Name", "body": "2-3 bullet points or key formulas", "importance": "High" }
  ]
}
Provide exactly 6 to 8 cards containing the most important topics to memorize.`;

    let generatedText = '';
    let cheatSheetData = null;
    try {
      const result = await model.generateContent([prompt, ...pdfParts]);
      generatedText = result.response.text().trim();
      const firstBrace = generatedText.indexOf('{');
      const lastBrace = generatedText.lastIndexOf('}');
      const jsonStr = generatedText.slice(firstBrace, lastBrace + 1);
      cheatSheetData = JSON.parse(jsonStr);
    } catch (e: any) {
      return NextResponse.json({ error: `AI Image JSON generation failed: ${e.message}` }, { status: 500 });
    }

    // Render the React Component for the Image!
    try {
      const imageResp = new ImageResponse(
        (
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', width: '100%', height: '100%', padding: '60px', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', fontSize: '72px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '20px' }}>
              {cheatSheetData.title}
            </div>
            <div style={{ display: 'flex', fontSize: '32px', color: '#94a3b8', marginBottom: '60px' }}>
              {cheatSheetData.overview}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {cheatSheetData.cards.map((card: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', width: '48%', backgroundColor: '#1e293b', borderRadius: '16px', padding: '30px', marginBottom: '40px', borderLeft: card.importance === 'High' ? '8px solid #ef4444' : '8px solid #3b82f6' }}>
                  <div style={{ display: 'flex', fontSize: '40px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '20px' }}>
                    {card.title} {card.importance === 'High' ? '🔥' : '📘'}
                  </div>
                  <div style={{ display: 'flex', fontSize: '28px', color: '#cbd5e1', lineHeight: 1.5 }}>
                    {card.body}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', fontSize: '24px', color: '#64748b', marginTop: 'auto', alignSelf: 'center' }}>
              Generated dynamically by DocsKeeper AI - 1-Pager Engine
            </div>
          </div>
        ),
        { width: 1600, height: 2000 }
      );

      const arrayBuffer = await imageResp.arrayBuffer();
      const base64Image = Buffer.from(arrayBuffer).toString('base64');
      const fileName = '1-Pager_CheatSheet.png';
      const filePath = `${subjectPath}/Notes/${fileName}`;

      let fileSha = undefined;
      try {
        const { data: fileData } = await octokit.repos.getContent({ owner: ORG, repo, path: filePath });
        if (!Array.isArray(fileData)) fileSha = fileData.sha;
      } catch (e) { /* file doesn't exist */ }

      await octokit.repos.createOrUpdateFileContents({
        owner: ORG,
        repo,
        path: filePath,
        message: `DocsKeeper AI: Generated beautiful 1-Pager PNG`,
        content: base64Image,
        sha: fileSha,
      });

      // Save a dummy chat so the frontend UI doesn't crash
      let chatId;
      try {
        await dbConnect();
        const chat = await Chat.create({
          userId, subjectPath, title: `1-Pager: ${subjectName}`,
          messages: [{ role: 'assistant', content: `![1-Pager Infographic](https://raw.githubusercontent.com/${ORG}/${repo}/main/${encodeURI(filePath)})\n\n*Your visual 1-Pager Infographic was successfully generated and uploaded to GitHub as ${fileName}!*` }],
          isPublic,
        });
        chatId = chat._id;
      } catch (e) {}

      return NextResponse.json({
        success: true,
        chatId: chatId,
        content: `Your visual 1-Pager Infographic was successfully generated and uploaded to GitHub as ${fileName}!`,
      });
    } catch (e: any) {
      return NextResponse.json({ error: `Image rendering/upload failed: ${e.message}` }, { status: 500 });
    }
  }

  // ==========================================
  // STANDARD MARKDOWN TEXT GENERATION
  // ==========================================
  const prompt = `You are a university exam study assistant. Analyze the provided documents (Syllabus, PYQs, and Notes) for the subject "${subjectName}" and generate comprehensive pre-processed study notes covering EVERY topic found in the syllabus and materials.
CRITICAL INSTRUCTIONS:
- You MUST aggressively reorganize and order the content based on IMPORTANCE.
- Mark highly important topics clearly using visually distinct icons.
- Format your response in beautiful Markdown with clear headings.
- Use proper LaTeX math formatting for all equations (e.g., $I_E = \\frac{V_E}{R_E}$) because the UI fully supports KaTeX rendering. Use $$ for block equations and $ for inline equations.
Include Subject Overview, Comprehensive Topic Breakdown, Likely Exam Questions, and Study Tips.`;

  let generatedText: string;
  try {
    const result = await model.generateContent([prompt, ...pdfParts]);
    generatedText = result.response.text().trim();
  } catch (e: any) {
    if (e.message && e.message.includes('429') && e.message.toLowerCase().includes('quota')) {
      return NextResponse.json({ error: 'Daily API Quota Limit Exceeded. Try tomorrow.' }, { status: 402 });
    }
    return NextResponse.json({ error: `AI generation failed: ${e.message}` }, { status: 500 });
  }

  await dbConnect();
  let chatId;
  try {
    const chat = await Chat.create({
      userId, subjectPath, title: `Study Notes: ${subjectName}`,
      messages: [{ role: 'assistant', content: generatedText }],
      isPublic,
    });
    chatId = chat._id;
  } catch (e: any) {
    return NextResponse.json({ error: `Failed to save to database: ${e.message}` }, { status: 500 });
  }

  try {
    const fileName = 'Comprehensive_Notes.md';
    const filePath = `${subjectPath}/Notes/${fileName}`;
    const fileContent = Buffer.from(generatedText).toString('base64');
    let fileSha = undefined;
    try {
      const { data: fileData } = await octokit.repos.getContent({ owner: ORG, repo, path: filePath });
      if (!Array.isArray(fileData)) fileSha = fileData.sha;
    } catch (e) {}

    await octokit.repos.createOrUpdateFileContents({
      owner: ORG, repo, path: filePath,
      message: `DocsKeeper AI: Generated ${fileName}`,
      content: fileContent,
      sha: fileSha,
    });
  } catch (e: any) {}

  return NextResponse.json({ success: true, chatId, content: generatedText });
}
