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
