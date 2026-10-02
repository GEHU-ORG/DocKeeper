'use server';
import { prisma } from '@/lib/prisma';

export async function getUniversities() {
  return await prisma.university.findMany({ select: { id: true, name: true, slug: true, fullName: true } });
}

export async function getCourses(universityId: string) {
  return await prisma.course.findMany({
    where: { universityId },
    select: { id: true, name: true }
  });
}

export async function getSemesters(courseId: string) {
  return await prisma.semester.findMany({
    where: { courseId },
    orderBy: { number: 'asc' },
    select: { id: true, name: true, number: true }
  });
}

export async function getSubjects(semesterId: string) {
  return await prisma.subject.findMany({
    where: { semesterId },
    select: { id: true, name: true }
  });
}

export async function addUniversity(name: string, slug: string, fullName: string) {
  // Create in Prisma
  const uni = await prisma.university.create({
    data: { name, slug, fullName, githubOrg: 'UniExamPrep' }
  });

  // Since we're in a server action, we can dynamically import github lib to avoid client boundary issues
  const { createRepository, createFolder } = await import('@/lib/github');
  
  try {
    // Create Repo on GitHub
    await createRepository(slug, `Study materials for ${fullName}`);
    // Delay slightly to ensure repo is ready for commits
    await new Promise(res => setTimeout(res, 2000));
    
    // Create base folders
    await createFolder(`UniExamPrep/${slug}/Notes`);
    await createFolder(`UniExamPrep/${slug}/PYQ`);
    await createFolder(`UniExamPrep/${slug}/Syllabus`);
  } catch (err) {
    console.error('Failed to setup GitHub repo for university:', err);
    // Ignore error if it already exists or failed, we still created the DB record
  }

  return uni;
}

export async function getSubjectDetails(subjectId: string) {
  return await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { studyNotes: { orderBy: { marks: 'asc' } } }
  });
}

export async function updateSubjectField(subjectId: string, field: 'syllabus' | 'pyqAnalysis', content: string) {
  return await prisma.subject.update({
    where: { id: subjectId },
    data: { [field]: content }
  });
}

export async function saveStudyNote(subjectId: string, marks: number, content: string) {
  return await prisma.studyNote.upsert({
    where: { subjectId_marks: { subjectId, marks } },
    update: { content },
    create: { subjectId, marks, content }
  });
}

export async function deleteStudyNote(id: string) {
  return await prisma.studyNote.delete({
    where: { id }
  });
}
