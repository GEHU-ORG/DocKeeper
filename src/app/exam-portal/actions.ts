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

  // Comprehensive Indian University Courses Structure
  const courseStructure = [
    { course: "B.Tech", departments: ["Computer Science Engineering (CSE)", "Mechanical Engineering (ME)", "Civil Engineering (CE)", "Electronics & Communication (ECE)", "Electrical Engineering (EE)"], semesters: 8 },
    { course: "BCA", departments: ["General"], semesters: 6 },
    { course: "BBA", departments: ["General"], semesters: 6 },
    { course: "BA", departments: ["English", "Journalism and Mass Communication"], semesters: 6 },
    { course: "B.Sc", departments: ["Animation", "Nursing", "IT", "PCM"], semesters: 6 },
    { course: "B.Pharm", departments: ["General"], semesters: 8 },
    { course: "B.Com (Hons)", departments: ["General"], semesters: 6 },
    { course: "BHM", departments: ["General"], semesters: 8 },
    { course: "Diploma", departments: ["Computer Science", "Mechanical", "Civil"], semesters: 6 },
    { course: "MBA", departments: ["Finance", "Marketing", "HR", "General"], semesters: 4 },
    { course: "MCA", departments: ["General"], semesters: 4 },
    { course: "M.Tech", departments: ["Computer Science Engineering (CSE)", "VLSI", "Thermal"], semesters: 4 }
  ];

  const repoPaths: string[] = [];
  
  // Base folders at the root
  repoPaths.push('Notes', 'PYQ', 'Syllabus');

  for (const info of courseStructure) {
    const safeCourse = info.course.replace(/[^a-zA-Z0-9.\- ]/g, '').trim();

    for (const dept of info.departments) {
      // Create Prisma Course representation
      const dbCourseName = dept === 'General' ? info.course : `${info.course} - ${dept}`;
      const course = await prisma.course.create({
        data: { name: dbCourseName, universityId: uni.id }
      });
      
      const semData = Array.from({ length: info.semesters }).map((_, i) => ({
        name: `Semester ${i + 1}`,
        number: i + 1,
        courseId: course.id
      }));

      await prisma.semester.createMany({ data: semData });

      // Generate GitHub Folder Paths: Type / Course / Department / Semester
      const safeDept = dept.replace(/[^a-zA-Z0-9.\- ()]/g, '').trim();
      
      for (let i = 1; i <= info.semesters; i++) {
        const semFolderName = `Semester-${i}`;
        
        for (const type of ['Notes', 'PYQ', 'Syllabus']) {
          if (dept === 'General') {
            repoPaths.push(`${type}/${safeCourse}/${semFolderName}`);
          } else {
            repoPaths.push(`${type}/${safeCourse}/${safeDept}/${semFolderName}`);
          }
        }
      }
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
