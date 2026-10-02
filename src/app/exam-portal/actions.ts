'use server';

import { prisma } from '@/lib/prisma';

export async function getUniversities() {
  return await prisma.university.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function getDepartments(universityId: string) {
  return await prisma.department.findMany({
    where: { universityId },
    orderBy: { name: 'asc' },
  });
}

export async function getBranches(departmentId: string) {
  return await prisma.branch.findMany({
    where: { departmentId },
    orderBy: { name: 'asc' },
  });
}

export async function getSemesters(branchId: string) {
  return await prisma.semester.findMany({
    where: { branchId },
    orderBy: { number: 'asc' },
  });
}

export async function getSubjects(semesterId: string) {
  return await prisma.subject.findMany({
    where: { semesterId },
    orderBy: { name: 'asc' },
  });
}
