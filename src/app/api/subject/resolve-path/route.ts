import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { path } = await req.json();
    if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

    const parts = path.split('/');
    // UniExamPrep / GEU / B.Tech / Computer Science Engineering (CSE) / Semester-7 / Big Data Analytics
    if (parts.length < 6) return NextResponse.json({ error: 'Invalid path depth' }, { status: 400 });

    const slug = parts[1];
    const courseCategory = parts[2];
    const departmentName = parts[3];
    const semesterStr = parts[4]; // e.g. Semester-7
    const subjectName = parts[5];

    const courseFullName = `${courseCategory} - ${departmentName}`;
    const semNumber = parseInt(semesterStr.replace('Semester-', ''), 10);

    const subject = await prisma.subject.findFirst({
      where: {
        name: subjectName,
        semester: {
          number: semNumber,
          department: {
            name: departmentName,
            course: {
              name: courseCategory,
              university: {
                slug: slug
              }
            }
          }
        }
      }
    });

    if (!subject) return NextResponse.json({ error: 'Subject not found in database' }, { status: 404 });

    return NextResponse.json({ subject });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
