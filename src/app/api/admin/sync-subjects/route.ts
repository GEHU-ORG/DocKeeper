import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
const ORG_NAME = 'UniExamPrep';

export async function POST(req: Request) {
  try {
    const { universityId } = await req.json();
    if (!universityId) return NextResponse.json({ error: 'universityId required' }, { status: 400 });

    const uni = await prisma.university.findUnique({ where: { id: universityId } });
    if (!uni) return NextResponse.json({ error: 'University not found' }, { status: 404 });

    // Fetch the repository tree from GitHub
    let treeData;
    try {
      const { data: refData } = await octokit.git.getRef({
        owner: ORG_NAME,
        repo: uni.slug,
        ref: 'heads/main'
      });
      const { data } = await octokit.git.getTree({
        owner: ORG_NAME,
        repo: uni.slug,
        tree_sha: refData.object.sha,
        recursive: '1'
      });
      treeData = data.tree;
    } catch (err: any) {
      console.error('Failed to fetch github tree:', err);
      return NextResponse.json({ error: 'Failed to fetch repository tree' }, { status: 500 });
    }

    // Map DB paths to Semester IDs
    const courses = await prisma.course.findMany({
      where: { universityId },
      include: { departments: { include: { semesters: true } } }
    });

    let newSubjectsCount = 0;

    for (const course of courses) {
      const safeCourse = course.name.replace(/[^a-zA-Z0-9.\- ]/g, '').trim();

      for (const dept of course.departments) {
        const isGeneral = dept.name === 'General';
        const safeDept = dept.name.replace(/[^a-zA-Z0-9.\- ()]/g, '').trim();

        for (const sem of dept.semesters) {
          const semFolderName = `Semester-${sem.number}`;
          // The path in GitHub where subjects live
          // If the department is 'General', it might not have a nested folder, OR it might. 
          // But our unflatten script created 'Course/Dept' for everything that had a ' - '.
          // For things like B.Com (Hons), they don't have a ' - ', so the script didn't unflatten them.
          // Wait, in GitHub, 'BCA - General' became 'BCA/General'. So they ARE nested!
          // Except for B.Com (Hons), BHM, etc which weren't split.
          const basePath = (!isGeneral && safeDept)
            ? `${safeCourse}/${safeDept}/${semFolderName}`
            : (['B.Com (Hons)', 'BHM'].includes(course.name)) 
                ? `${safeCourse}/${semFolderName}` 
                : `${safeCourse}/${safeDept}/${semFolderName}`; // For BCA/General

          // Find all folders inside this path in GitHub tree
          const subjectsInGithub = new Set<string>();
          for (const item of treeData) {
            if (item.type === 'tree' && item.path?.startsWith(basePath + '/')) {
              // Path: B.Tech/CSE/Semester-6/Data Structures
              const relativePath = item.path.substring(basePath.length + 1);
              const parts = relativePath.split('/');
              // If it's a direct child folder, it's a Subject
              if (parts.length === 1 && !['Notes', 'PYQ', 'Syllabus'].includes(parts[0])) {
                subjectsInGithub.add(parts[0]);
              }
            }
          }

          // Add them to DB if they don't exist
          for (const subName of subjectsInGithub) {
            try {
              await prisma.subject.create({
                data: { name: subName, semesterId: sem.id }
              });
              newSubjectsCount++;
            } catch (e) {
              // Ignore unique constraint errors
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, count: newSubjectsCount });
  } catch (error: any) {
    console.error('Sync failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
