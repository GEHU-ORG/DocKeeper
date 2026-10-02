import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createFolderTree } from '@/lib/github';

export async function POST(req: Request) {
  try {
    const { slug, courseCategory, departmentName, numSemesters } = await req.json();
    if (!slug || !courseCategory || !departmentName || !numSemesters) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const uni = await prisma.university.findUnique({ where: { slug } });
    if (!uni) return NextResponse.json({ error: 'University not found' }, { status: 404 });

    const courseFullName = `${courseCategory} - ${departmentName}`;
    const course = await prisma.course.create({
      data: { name: courseFullName, universityId: uni.id }
    });

    const semData = Array.from({ length: parseInt(numSemesters) }).map((_, i) => ({
      name: `Semester ${i + 1}`,
      number: i + 1,
      courseId: course.id
    }));
    await prisma.semester.createMany({ data: semData });

    const repoPaths = Array.from({ length: parseInt(numSemesters) }).map((_, i) => 
      `${courseCategory}/${departmentName}/Semester-${i + 1}/.keep`
    );

    // Create the folders in GitHub
    await createFolderTree(slug, repoPaths);

    return NextResponse.json({ success: true, course });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
