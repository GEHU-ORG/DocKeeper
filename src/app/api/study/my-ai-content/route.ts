import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Chat } from '@/models/Chat';
import { PyqAnswer } from '@/models/PyqAnswer';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = ((session.user as any).githubUsername ?? session.user.email ?? 'anonymous') as string;

  const url = new URL(req.url);
  const subjectPath = url.searchParams.get('subjectPath');
  const type = url.searchParams.get('type'); // 'notes' or 'pyq'

  const id = url.searchParams.get('id');

  if (!subjectPath || !type) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  await dbConnect();

  try {
    if (id) {
      if (type === 'notes') {
        const chat = await Chat.findOne({ _id: id, $or: [{ isPublic: { $ne: false } }, { userId }] }).lean();
        return NextResponse.json(chat);
      } else if (type === 'pyq') {
        const answer = await PyqAnswer.findOne({ _id: id, $or: [{ isPublic: { $ne: false } }, { userId }] }).lean();
        return NextResponse.json(answer);
      }
    }

    if (type === 'notes') {
      const chats = await Chat.find({
        subjectPath,
        $or: [{ isPublic: { $ne: false } }, { userId }]
      }).sort({ createdAt: -1 }).select('title createdAt updatedAt userId isPublic').lean();
      return NextResponse.json({ items: chats });
    } else if (type === 'pyq') {
      const answers = await PyqAnswer.find({
        subjectPath,
        $or: [{ isPublic: { $ne: false } }, { userId }]
      }).sort({ createdAt: -1 }).select('pdfName createdAt updatedAt userId isPublic').lean();
      return NextResponse.json({ items: answers });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
  }
}
