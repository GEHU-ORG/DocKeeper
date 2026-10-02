import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Upsert University
    const university = await prisma.university.upsert({
      where: { slug: 'gehu' },
      update: {},
      create: { 
        name: 'GEHU', 
        slug: 'gehu',
        fullName: 'Graphic Era Hill University',
        githubOrg: 'UniExamPrep'
      }
    });

    // 2. Define Courses and Subjects to seed (Flattened)
    const structure = [
      {
        course: 'BTech-CSE',
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        subjects: ['Data Structures', 'Operating Systems', 'Computer Networks']
      },
      {
        course: 'BTech-Mechanical',
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        subjects: ['Thermodynamics', 'Fluid Mechanics']
      },
      {
        course: 'BTech-ECE',
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        subjects: ['Signals & Systems', 'Digital Electronics']
      },
      {
        course: 'BCA-General',
        semesters: [1, 2, 3, 4, 5, 6],
        subjects: ['C Programming', 'Web Technologies', 'Software Engineering']
      },
      {
        course: 'MCA-General',
        semesters: [1, 2, 3, 4],
        subjects: ['Advanced Java', 'Machine Learning', 'Cloud Computing']
      },
      {
        course: 'BPharma-General',
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        subjects: ['Human Anatomy', 'Pharmaceutics', 'Pharmacology']
      },
      {
        course: 'MBA-Finance',
        semesters: [1, 2, 3, 4],
        subjects: ['Financial Management', 'Accounting']
      },
      {
        course: 'MBA-Marketing',
        semesters: [1, 2, 3, 4],
        subjects: ['Consumer Behavior', 'Digital Marketing']
      }
    ];

    // 3. Seed Database
    for (const data of structure) {
      const course = await prisma.course.upsert({
        where: { name_universityId: { name: data.course, universityId: university.id } },
        update: {},
        create: { name: data.course, universityId: university.id }
      });

      for (const sem of data.semesters) {
        let semester = await prisma.semester.findFirst({
          where: { name: `Semester ${sem}`, courseId: course.id }
        });
        if (!semester) {
          semester = await prisma.semester.create({
            data: { name: `Semester ${sem}`, number: sem, courseId: course.id }
          });
        }

        // Add subjects to each semester
        for (const sub of data.subjects) {
          await prisma.subject.create({
            data: { name: `${sub} (Sem ${sem})`, semesterId: semester.id }
          }).catch(() => {}); // ignore unique constraint if exists
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Database successfully seeded with flattened 4-level architecture!' });
  } catch (error: any) {
    console.error('Sync failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
