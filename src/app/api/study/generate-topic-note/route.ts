export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/lib/mongoose';
import { TopicNote } from '@/models/TopicNote';
import { prisma } from '@/lib/prisma';
import mongoose from 'mongoose';
import { checkGlobalRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    await checkGlobalRateLimit(12);
  } catch (err: any) {
    if (err.message === 'TUNNEL_RATE_LIMIT') {
      return NextResponse.json({ error: 'Global Tunnel Rate Limit hit. Retrying...' }, { status: 429 });
    }
  }

  const userId = ((session.user as any).githubUsername ?? session.user.email ?? 'anonymous') as string;

  const { syllabusId, topicName, subjectPath } = await req.json();
  if (!syllabusId || !topicName || !subjectPath) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  await dbConnect();
  
  // Check if it already exists
  const existingNote = await TopicNote.findOne({ syllabusId, topicName });
  if (existingNote && existingNote.content) {
    return NextResponse.json({ success: true, note: existingNote });
  }

  let apiKey = process.env.GEMINI_API_KEY!;
  let isPublic = true;
  let customModel = 'gemini-2.5-flash-lite';

  if (session.user.email) {
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { geminiApiKey: true, geminiModel: true } });
    if (dbUser?.geminiApiKey) {
      apiKey = dbUser.geminiApiKey;
      isPublic = false;
      if (dbUser.geminiModel) customModel = dbUser.geminiModel;
    }
  }

  const customGenai = new GoogleGenerativeAI(apiKey);
  const model = customGenai.getGenerativeModel({ model: customModel });
  
  const prompt = `You are a university professor creating highly detailed study notes for a specific topic in a course.
Course/Subject Context: ${subjectPath}
Specific Topic to Explain: "${topicName}"

Instructions:
1. Provide a comprehensive, exam-oriented explanation of this topic.
2. Use clear headings, bullet points, and bold text for key terms.
3. Include real-world examples or analogies where appropriate.
4. Keep the explanation entirely focused on the topic: "${topicName}". Do not wander into other syllabus topics.
5. Format the entire response in clean Markdown.`;

  try {
    const result = await model.generateContent(prompt);
    const content = result.response.text().trim();

    let note = existingNote;
    if (note) {
      note.content = content;
      await note.save();
    } else {
      note = await TopicNote.create({
        userId,
        syllabusId: new mongoose.Types.ObjectId(syllabusId),
        subjectPath,
        topicName,
        content,
        isPublic,
      });
    }

    return NextResponse.json({ success: true, note });
  } catch (e: any) {
    return NextResponse.json({ error: `AI generation failed: ${e.message}` }, { status: 500 });
  }
}
