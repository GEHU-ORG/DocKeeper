import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listItems } from '@/lib/github';

export async function GET() {
  try {
    // 1. Fetch all repositories (Departments)
    const repos = await listItems('GEHU-ORG');
    
    for (const repo of repos) {
      if (repo.type !== 'folder') continue; // repos are represented as 'folder' in listItems root

      // Upsert Department
      const department = await prisma.department.upsert({
        where: { name: repo.name },
        update: {},
        create: { name: repo.name }
      });

      // 2. Fetch branches (Level 1 folders)
      try {
        const branches = await listItems(repo.path);
        
        for (const branch of branches) {
          if (branch.type !== 'folder') continue;

          // Upsert Branch
          let branchRecord = await prisma.branch.findFirst({
            where: { name: branch.name, departmentId: department.id }
          });

          if (!branchRecord) {
            branchRecord = await prisma.branch.create({
              data: { name: branch.name, departmentId: department.id }
            });
          }

          // 3. Fetch subjects (Level 2 folders)
          try {
            const subjects = await listItems(branch.path);
            for (const subject of subjects) {
              if (subject.type !== 'folder') continue;

              await prisma.subject.findFirst({
                where: { name: subject.name, branchId: branchRecord.id }
              }).then(async (existing) => {
                if (!existing) {
                  await prisma.subject.create({
                    data: { name: subject.name, branchId: branchRecord!.id }
                  });
                }
              });
            }
          } catch (e) {
             console.error(`Failed to list subjects for ${branch.path}`, e);
          }
        }
      } catch (e) {
        console.error(`Failed to list branches for ${repo.path}`, e);
      }
    }

    return NextResponse.json({ success: true, message: 'Database successfully synced with GitHub!' });
  } catch (error: any) {
    console.error('Sync failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
