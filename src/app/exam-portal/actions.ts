'use server';

import { prisma } from '@/lib/prisma';

export async function getDepartments() {
  return await prisma.department.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function getBranches(departmentId: string) {
  return await prisma.branch.findMany({
    where: { departmentId },
    orderBy: { name: 'asc' },
  });
}

export async function getSubjects(branchId: string) {
  return await prisma.subject.findMany({
    where: { branchId },
    orderBy: { name: 'asc' },
  });
}
