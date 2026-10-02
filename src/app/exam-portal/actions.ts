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
    // Engineering & Technology
    { course: "B.Tech", departments: ["Computer Science Engineering (CSE)", "Mechanical Engineering (ME)", "Civil Engineering (CE)", "Electronics & Communication (ECE)", "Electrical Engineering (EE)", "Information Technology (IT)", "Artificial Intelligence & Machine Learning (AIML)", "Data Science", "Cyber Security", "Aerospace Engineering", "Biotechnology"], semesters: 8 },
    { course: "M.Tech", departments: ["Computer Science Engineering (CSE)", "VLSI Design", "Thermal Engineering", "Structural Engineering", "Power Systems", "AI & Data Science"], semesters: 4 },
    { course: "Diploma (Polytechnic)", departments: ["Computer Science", "Mechanical", "Civil", "Electrical", "Electronics"], semesters: 6 },
    
    // Computer Applications
    { course: "BCA", departments: ["General", "Data Science", "Artificial Intelligence", "Cyber Security"], semesters: 6 },
    { course: "MCA", departments: ["General", "Artificial Intelligence", "Data Science"], semesters: 4 },
    
    // Business & Management
    { course: "BBA", departments: ["General", "Human Resources", "Marketing", "Finance", "International Business", "Hospitality Management"], semesters: 6 },
    { course: "MBA", departments: ["Finance", "Marketing", "Human Resources (HR)", "General", "International Business", "Operations", "Business Analytics"], semesters: 4 },
    { course: "B.Com", departments: ["General", "Honors", "Accounting & Finance", "Taxation", "Corporate Affairs"], semesters: 6 },
    { course: "M.Com", departments: ["General", "Finance & Control", "Accounting"], semesters: 4 },
    
    // Arts, Humanities & Social Sciences
    { course: "BA", departments: ["English", "Journalism and Mass Communication (JMC)", "Economics", "History", "Political Science", "Psychology", "Sociology", "Geography", "Hindi"], semesters: 6 },
    { course: "MA", departments: ["English", "History", "Economics", "Political Science", "Psychology", "Sociology", "Mass Communication"], semesters: 4 },
    
    // Pure Sciences
    { course: "B.Sc", departments: ["Physics", "Chemistry", "Mathematics", "IT", "Computer Science", "Animation & VFX", "Agriculture", "Biotechnology", "Microbiology", "Nursing", "ZBC (Zoology, Botany, Chemistry)", "PCM (Physics, Chemistry, Maths)"], semesters: 6 },
    { course: "M.Sc", departments: ["Physics", "Chemistry", "Mathematics", "Botany", "Zoology", "Biotechnology", "IT", "Data Science", "Environmental Science"], semesters: 4 },
    
    // Medicine & Pharmacy
    { course: "B.Pharm", departments: ["General"], semesters: 8 },
    { course: "M.Pharm", departments: ["Pharmaceutics", "Pharmacology", "Pharmaceutical Chemistry"], semesters: 4 },
    { course: "MBBS", departments: ["General"], semesters: 9 }, // Technically 4.5 years + internship
    { course: "BDS", departments: ["General"], semesters: 8 },
    { course: "BPT (Physiotherapy)", departments: ["General"], semesters: 8 },
    
    // Law
    { course: "LLB", departments: ["General"], semesters: 6 },
    { course: "BA LLB (Integrated)", departments: ["General", "Corporate Law", "Criminal Law"], semesters: 10 },
    { course: "LLM", departments: ["Corporate Law", "Criminal Law", "Human Rights"], semesters: 4 },
    
    // Architecture & Design
    { course: "B.Arch", departments: ["General"], semesters: 10 },
    { course: "B.Des", departments: ["Fashion Design", "Interior Design", "Graphic Design", "Product Design"], semesters: 8 },
    
    // Education & Hospitality
    { course: "B.Ed", departments: ["General"], semesters: 4 },
    { course: "BHM (Hotel Management)", departments: ["General", "Culinary Arts", "Travel & Tourism"], semesters: 8 }
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
