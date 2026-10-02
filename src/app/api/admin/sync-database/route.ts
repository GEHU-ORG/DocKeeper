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

    // 2. Define Courses, Departments and Subjects to seed
    const structure = [
      {
        course: 'B.Tech',
        department: 'Computer Science Engineering (CSE)',
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        subjects: ['Data Structures', 'Operating Systems', 'Computer Networks']
      },
      {
        course: 'B.Tech',
        department: 'Mechanical Engineering (ME)',
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        subjects: ['Thermodynamics', 'Fluid Mechanics']
      },
      {
        course: 'B.Tech',
        department: 'Electronics & Communication (ECE)',
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        subjects: ['Signals & Systems', 'Digital Electronics']
      },
      {
        course: 'BCA',
        department: 'General',
        semesters: [1, 2, 3, 4, 5, 6],
        subjects: ['C Programming', 'Web Technologies', 'Software Engineering']
      },
      {
        course: 'MCA',
        department: 'General',
        semesters: [1, 2, 3, 4],
        subjects: ['Advanced Java', 'Machine Learning', 'Cloud Computing']
      },
      {
        course: 'B.Pharm',
        department: 'General',
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        subjects: ['Human Anatomy', 'Pharmaceutics', 'Pharmacology']
      },
      {
        course: 'MBA',
        department: 'Finance',
        semesters: [1, 2, 3, 4],
        subjects: ['Financial Management', 'Accounting']
      },
      {
        course: 'MBA',
        department: 'Marketing',
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

      const department = await prisma.department.upsert({
        where: { name_courseId: { name: data.department, courseId: course.id } },
        update: {},
        create: { name: data.department, courseId: course.id }
      });

      for (const sem of data.semesters) {
        let semester = await prisma.semester.findFirst({
          where: { name: `Semester ${sem}`, departmentId: department.id }
        });
        if (!semester) {
          semester = await prisma.semester.create({
            data: { name: `Semester ${sem}`, number: sem, departmentId: department.id }
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

    return NextResponse.json({ success: true, message: 'Database successfully seeded with new Department architecture!' });
  } catch (error: any) {
    console.error('Sync failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
