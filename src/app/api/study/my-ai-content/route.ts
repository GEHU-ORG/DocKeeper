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
        const chat = await Chat.findOne({ _id: id, $or: [{ isPublic: { $ne: false } }, { userId }] }).lean() as any;
        if (chat) chat.isOwner = (chat.userId === userId);
        return NextResponse.json(chat);
      } else if (type === 'pyq') {
        const answer = await PyqAnswer.findOne({ _id: id, $or: [{ isPublic: { $ne: false } }, { userId }] }).lean() as any;
        if (answer) answer.isOwner = (answer.userId === userId);
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

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = ((session.user as any).githubUsername ?? session.user.email ?? 'anonymous') as string;

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');

  if (!type || !id) return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });

  try {
    const { isPublic } = await req.json();
    await dbConnect();

    if (type === 'notes') {
      const chat = await Chat.findOneAndUpdate({ _id: id, userId }, { isPublic }, { new: true });
      if (!chat) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
      return NextResponse.json({ success: true, isPublic: chat.isPublic });
    } else if (type === 'pyq') {
      const answer = await PyqAnswer.findOneAndUpdate({ _id: id, userId }, { isPublic }, { new: true });
      if (!answer) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
      return NextResponse.json({ success: true, isPublic: answer.isPublic });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: `Update failed: ${error.message}` }, { status: 500 });
  }
}
