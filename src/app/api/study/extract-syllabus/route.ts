export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/lib/mongoose';
import { Syllabus } from '@/models/Syllabus';
import { TopicNote } from '@/models/TopicNote';
import { prisma } from '@/lib/prisma';

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
const ORG = 'UniExamPrep';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = ((session.user as any).githubUsername ?? session.user.email ?? 'anonymous') as string;

  const { repo, subjectPath, pdfFile, effectiveYear } = await req.json();
  if (!repo || !subjectPath || !pdfFile) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  await dbConnect();
  const existingSyllabus = await Syllabus.findOne({ pdfUrl: pdfFile.url || pdfFile.path });
  
  if (existingSyllabus) {
    const existingNotes = await TopicNote.find({ syllabusId: existingSyllabus._id }).select('topicName content');
    const notesMap: Record<string, string> = {};
    existingNotes.forEach(n => {
      notesMap[n.topicName] = n.content;
    });

    return NextResponse.json({ 
      success: true, 
      syllabusId: existingSyllabus._id, 
      units: existingSyllabus.units,
      notesMap 
    });
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
    return NextResponse.json({ error: `Could not read Syllabus PDF: ${e.message}` }, { status: 400 });
  }

  const model = customGenai.getGenerativeModel({ model: customModel });
  
  try {
    const extractPrompt = `You are a university curriculum parser. Analyze the provided Syllabus PDF.
Extract the course structure into Units and their Topics.
Return ONLY a raw valid JSON array of objects. Do not include markdown formatting like \`\`\`json.
Format strictly as:
[
  {
    "unitNumber": 1,
    "unitTitle": "Name of Unit",
    "topics": ["Topic 1", "Topic 2"]
  }
]`;

    const extractResult = await model.generateContent([extractPrompt, { inlineData }]);
    const rawText = extractResult.response.text().trim();
    
    // Robust JSON extraction
    const firstBracket = rawText.indexOf('[');
    const lastBracket = rawText.lastIndexOf(']');
    if (firstBracket === -1 || lastBracket === -1) {
      throw new Error('No JSON array found in AI response');
    }
    const jsonStr = rawText.slice(firstBracket, lastBracket + 1);
    
    let units = [];
    try {
      units = JSON.parse(jsonStr);
      if (!Array.isArray(units)) throw new Error('Not an array');
    } catch {
      return NextResponse.json({ error: 'AI failed to parse syllabus structurally.' }, { status: 500 });
    }

    await dbConnect();
    const syllabus = await Syllabus.create({
      userId,
      subjectPath,
      pdfUrl: pdfFile.url || pdfFile.path,
      pdfName: pdfFile.name,
      effectiveYear: effectiveYear || new Date().getFullYear().toString(),
      units,
      isPublic,
    });

    return NextResponse.json({ success: true, syllabusId: syllabus._id, units: syllabus.units });
  } catch (e: any) {
    return NextResponse.json({ error: `AI extraction failed: ${e.message}` }, { status: 500 });
  }
}
