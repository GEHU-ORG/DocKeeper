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

  // Standard Indian University Courses to pre-populate
  const defaultCourses = [
    { name: 'B.Tech - CSE', semesters: 8 },
    { name: 'B.Tech - ME', semesters: 8 },
    { name: 'B.Tech - CE', semesters: 8 },
    { name: 'B.Tech - EE', semesters: 8 },
    { name: 'B.Tech - ECE', semesters: 8 },
    { name: 'BCA', semesters: 6 },
    { name: 'BBA', semesters: 6 },
    { name: 'B.Sc - IT', semesters: 6 },
    { name: 'B.Sc - PCM', semesters: 6 },
    { name: 'MBA - Finance', semesters: 4 },
    { name: 'MBA - Marketing', semesters: 4 },
    { name: 'MBA - HR', semesters: 4 },
    { name: 'MCA', semesters: 4 },
    { name: 'M.Tech - CSE', semesters: 4 },
  ];

  for (const courseInfo of defaultCourses) {
    const course = await prisma.course.create({
      data: { name: courseInfo.name, universityId: uni.id }
    });
    
    const semData = Array.from({ length: courseInfo.semesters }).map((_, i) => ({
      name: `Semester ${i + 1}`,
      number: i + 1,
      courseId: course.id
    }));

    await prisma.semester.createMany({ data: semData });
  }

  // Build the list of repository paths to create
  const repoPaths: string[] = [];
  
  // Base folders at the root (optional, but good for general stuff)
  repoPaths.push('Notes', 'PYQ', 'Syllabus');
  
  // Generate a folder for every Course -> Semester combination
  for (const courseInfo of defaultCourses) {
    // Sanitize course name for folder path (e.g., "B.Tech - CSE" -> "BTech-CSE")
    const courseFolderName = courseInfo.name.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-');
    for (let i = 1; i <= courseInfo.semesters; i++) {
      const semFolderName = `Semester-${i}`;
      repoPaths.push(`${courseFolderName}/${semFolderName}/Notes`);
      repoPaths.push(`${courseFolderName}/${semFolderName}/PYQ`);
      repoPaths.push(`${courseFolderName}/${semFolderName}/Syllabus`);
    }
  }

  // Since we're in a server action, we can dynamically import github lib to avoid client boundary issues
  const { createRepository, createFolderTree } = await import('@/lib/github');
  
  try {
    // Create Repo on GitHub
    await createRepository(slug, `Study materials for ${fullName}`);
    // Delay slightly to ensure repo is initialized with a commit (auto_init = true)
    await new Promise(res => setTimeout(res, 3000));
    
    // Create the entire folder tree in one massive commit
    await createFolderTree(slug, repoPaths);
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
