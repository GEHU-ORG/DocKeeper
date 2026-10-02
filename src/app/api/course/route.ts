import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createFolder } from '@/lib/github';

export async function POST(req: Request) {
  try {
    const { slug, courseName } = await req.json();
    if (!slug || !courseName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const uni = await prisma.university.findUnique({ where: { slug } });
    if (!uni) return NextResponse.json({ error: 'University not found' }, { status: 404 });

    const course = await prisma.course.create({
      data: { name: courseName, universityId: uni.id }
    });

    await createFolder(`UniExamPrep/${slug}/${courseName}`);

    return NextResponse.json({ success: true, course });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
