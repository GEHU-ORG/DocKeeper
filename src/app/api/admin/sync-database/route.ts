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

    // 2. Define Departments, Branches, and Subjects to seed
    const structure = [
      {
        department: 'B.Tech',
        branches: [
          { name: 'CSE', semesters: [1, 2, 3, 4, 5, 6, 7, 8], subjects: ['Data Structures', 'Operating Systems', 'Computer Networks'] },
          { name: 'Mechanical', semesters: [1, 2, 3, 4, 5, 6, 7, 8], subjects: ['Thermodynamics', 'Fluid Mechanics'] },
          { name: 'ECE', semesters: [1, 2, 3, 4, 5, 6, 7, 8], subjects: ['Signals & Systems', 'Digital Electronics'] },
        ]
      },
      {
        department: 'BCA',
        branches: [
          { name: 'General', semesters: [1, 2, 3, 4, 5, 6], subjects: ['C Programming', 'Web Technologies', 'Software Engineering'] }
        ]
      },
      {
        department: 'MCA',
        branches: [
          { name: 'General', semesters: [1, 2, 3, 4], subjects: ['Advanced Java', 'Machine Learning', 'Cloud Computing'] }
        ]
      },
      {
        department: 'B.Pharma',
        branches: [
          { name: 'General', semesters: [1, 2, 3, 4, 5, 6, 7, 8], subjects: ['Human Anatomy', 'Pharmaceutics', 'Pharmacology'] }
        ]
      },
      {
        department: 'MBA',
        branches: [
          { name: 'Finance', semesters: [1, 2, 3, 4], subjects: ['Financial Management', 'Accounting'] },
          { name: 'Marketing', semesters: [1, 2, 3, 4], subjects: ['Consumer Behavior', 'Digital Marketing'] }
        ]
      }
    ];

    // 3. Seed Database
    for (const dep of structure) {
      const department = await prisma.department.upsert({
        where: { name_universityId: { name: dep.department, universityId: university.id } },
        update: {},
        create: { name: dep.department, universityId: university.id }
      });

      for (const b of dep.branches) {
        let branch = await prisma.branch.findFirst({
          where: { name: b.name, departmentId: department.id }
        });
        if (!branch) {
          branch = await prisma.branch.create({
            data: { name: b.name, departmentId: department.id }
          });
        }

        for (const sem of b.semesters) {
          let semester = await prisma.semester.findFirst({
            where: { name: `Semester ${sem}`, branchId: branch.id }
          });
          if (!semester) {
            semester = await prisma.semester.create({
              data: { name: `Semester ${sem}`, number: sem, branchId: branch!.id }
            });
          }

          // Add subjects to each semester
          for (const sub of b.subjects) {
            await prisma.subject.create({
              data: { name: `${sub} (Sem ${sem})`, semesterId: semester.id }
            }).catch(() => {}); // ignore unique constraint if exists
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Database successfully seeded with multi-department structure!' });
  } catch (error: any) {
    console.error('Sync failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
