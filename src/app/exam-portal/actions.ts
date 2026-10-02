
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

export async function createSubject(name: string, semesterId: string) {
  return await prisma.subject.create({
    data: { name, semesterId }
  });
}

export async function addUniversity(name: string, slug: string, fullName: string) {
  // Create in Prisma
  const uni = await prisma.university.create({
    data: { name, slug, fullName, githubOrg: 'UniExamPrep' }
  });

  const courseStructure = [
    {
      course: "B.Tech",
      departments: ["Computer Science Engineering (CSE)"],
      semesters: 8,
      subjects: {"1":["Mathematics I","Physics","Basic Electrical Engineering","Engineering Graphics","English Communication"],"2":["Mathematics II","Chemistry","Programming for Problem Solving","Basic Electronics","Environmental Science"],"3":["Data Structures","Object Oriented Programming","Digital Logic Design","Discrete Mathematics","Computer Organization"],"4":["Operating Systems","Design and Analysis of Algorithms","Database Management Systems","Formal Languages and Automata Theory","Computer Networks"],"5":["Software Engineering","Compiler Design","Microprocessors","Web Technologies","Computer Graphics"],"6":["Machine Learning","Artificial Intelligence","Cryptography and Network Security","Cloud Computing","Internet of Things"],"7":["Big Data Analytics","Blockchain Technology","Deep Learning","Software Testing","Project Phase I"],"8":["Cyber Security","Mobile Computing","Project Phase II","Seminar"]}
    },
    {
      course: "B.Tech",
      departments: ["Mechanical Engineering (ME)"],
      semesters: 8,
      subjects: {"1":["Mathematics I","Physics","Basic Electrical Engineering","Engineering Graphics"],"2":["Mathematics II","Chemistry","Programming","Engineering Mechanics"],"3":["Thermodynamics","Fluid Mechanics","Material Science","Strength of Materials"],"4":["Kinematics of Machinery","Applied Thermodynamics","Manufacturing Processes","Machine Drawing"],"5":["Dynamics of Machinery","Heat Transfer","Design of Machine Elements I"],"6":["Design of Machine Elements II","CAD CAM","Operations Research"],"7":["Automobile Engineering","Refrigeration and Air Conditioning","Project Phase I"],"8":["Power Plant Engineering","Mechatronics","Project Phase II"]}
    },
    {
      course: "BCA",
      departments: ["General"],
      semesters: 6,
      subjects: {"1":["Mathematics I","Computer Fundamentals","C Programming","Communication Skills"],"2":["Mathematics II","Data Structures using C","Computer Organization","Web Designing"],"3":["Object Oriented Programming using C++","Database Management Systems","Software Engineering"],"4":["Java Programming","Operating Systems","Computer Networks","PHP Programming"],"5":["Python Programming","Artificial Intelligence","Computer Graphics","E-Commerce"],"6":["Mobile Application Development","Cyber Security","Major Project"]}
    },
    {
      course: "BBA",
      departments: ["General"],
      semesters: 6,
      subjects: {"1":["Principles of Management","Business Economics","Business Accounting","Business Communication"],"2":["Organizational Behavior","Business Statistics","Financial Management","Marketing Management"],"3":["Human Resource Management","Business Environment","Management Accounting","Business Law"],"4":["Research Methodology","Operations Management","International Business","Taxation"],"5":["Strategic Management","Entrepreneurship","E-Commerce","Elective I"],"6":["Business Policy","Elective II","Elective III","Major Project"]}
    },
    {
      course: "MBA",
      departments: ["General"],
      semesters: 4,
      subjects: {"1":["Management Principles","Managerial Economics","Accounting for Managers","Quantitative Techniques"],"2":["Financial Management","Marketing Management","Human Resource Management","Operations Management"],"3":["Strategic Management","Business Ethics","Elective I","Elective II"],"4":["Project Management","Elective III","Elective IV","Major Project"]}
    },
    {
      course: "BA",
      departments: ["English"],
      semesters: 6,
      subjects: {"1":["History of English Literature I","British Poetry","Communication Skills"],"2":["History of English Literature II","British Drama","Environmental Studies"],"3":["American Literature","British Prose","Literary Criticism"],"4":["Indian Writing in English","British Fiction","Women's Writing"],"5":["Modern European Drama","Postcolonial Literature","Literary Theory"],"6":["Contemporary Literature","World Literature","Project Work"]}
    },
    {
      course: "B.Pharm",
      departments: ["General"],
      semesters: 8,
      subjects: {"1":["Human Anatomy and Physiology I","Pharmaceutical Analysis","Pharmaceutics I","Pharmaceutical Inorganic Chemistry"],"2":["Human Anatomy and Physiology II","Pharmaceutical Organic Chemistry I","Biochemistry","Pathophysiology"],"3":["Pharmaceutical Organic Chemistry II","Physical Pharmaceutics I","Pharmaceutical Microbiology","Pharmaceutical Engineering"],"4":["Pharmaceutical Organic Chemistry III","Medicinal Chemistry I","Physical Pharmaceutics II","Pharmacology I"],"5":["Medicinal Chemistry II","Industrial Pharmacy I","Pharmacology II","Pharmacognosy II"],"6":["Medicinal Chemistry III","Pharmacology III","Herbal Drug Technology","Biopharmaceutics"],"7":["Instrumental Methods of Analysis","Industrial Pharmacy II","Pharmacy Practice","Novel Drug Delivery System"],"8":["Biostatistics and Research Methodology","Social and Preventive Pharmacy","Project Work"]}
    },
    {
      course: "B.Tech",
      departments: ["Civil Engineering (CE)"],
      semesters: 8,
      subjects: {}
    },
    {
      course: "B.Tech",
      departments: ["Electronics & Communication (ECE)"],
      semesters: 8,
      subjects: {}
    },
    {
      course: "B.Tech",
      departments: ["Electrical Engineering (EE)"],
      semesters: 8,
      subjects: {}
    },
    {
      course: "B.Tech",
      departments: ["Information Technology (IT)"],
      semesters: 8,
      subjects: {}
    },
  ];


  const repoPaths: string[] = [];

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

      // In sqlite/prisma, createMany doesn't return created IDs, so we find them after
      await prisma.semester.createMany({ data: semData });
      
      const createdSems = await prisma.semester.findMany({
        where: { courseId: course.id },
        orderBy: { number: 'asc' }
      });

      // Generate GitHub Folder Paths: Course / Department / Semester / Subject / Type
      const safeDept = dept.replace(/[^a-zA-Z0-9.\- ()]/g, '').trim();
      
      for (let i = 1; i <= info.semesters; i++) {
        const semFolderName = `Semester-${i}`;
        const semRecord = createdSems.find(s => s.number === i);
        
        // Find subjects for this semester (from structure or generic)
        const subjectsObj = (info as any).subjects;
        let subjectsList = subjectsObj && subjectsObj[i] ? subjectsObj[i] : ["Core Subject 1", "Core Subject 2"];
        
        for (const sub of subjectsList) {
          // Create subject in Prisma
          if (semRecord) {
            await prisma.subject.create({
              data: { name: sub, semesterId: semRecord.id }
            }).catch(() => {});
          }

          const safeSub = sub.replace(/[^a-zA-Z0-9.\- ()]/g, '').trim();

          for (const type of ['Notes', 'PYQ', 'Syllabus']) {
            if (dept === 'General') {
              repoPaths.push(`${safeCourse}/${semFolderName}/${safeSub}/${type}`);
            } else {
              repoPaths.push(`${safeCourse}/${safeDept}/${semFolderName}/${safeSub}/${type}`);
            }
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
