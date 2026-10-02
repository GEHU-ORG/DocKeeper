import { NextRequest, NextResponse } from 'next/server';
import { createFolder, deleteItem } from '@/lib/github';
import { getAuthContext } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Check if a Google user owns a given path (or any file under it).
 * GitHub users bypass this check entirely.
 */
async function checkGoogleOwnership(userEmail: string, path: string): Promise<boolean> {
  const record = await prisma.fileOwnership.findFirst({
    where: {
      userEmail,
      // The path starts with the requested path (handles folder deletes too)
      filePath: { startsWith: path },
    },
  });
  return !!record;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, path } = await request.json();
    if (!name || typeof path !== 'string') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const targetPath = path === auth.value ? `UniExamPrep/${name}` : `${path}/${name}`;
    const tokenToUse = auth.type === 'github' ? auth.accessToken : undefined;

    const pathParts = targetPath.split('/').filter(Boolean);
    const isSubjectFolder = pathParts.length === 6;

    if (isSubjectFolder) {
      // Create all 3 standard subfolders (this automatically creates the parent subject folder)
      await createFolder(`${targetPath}/PYQ`, tokenToUse);
      await createFolder(`${targetPath}/Notes`, tokenToUse);
      await createFolder(`${targetPath}/Syllabus`, tokenToUse);
    } else {
      await createFolder(targetPath, tokenToUse);
    }

    // Record folder .keep file ownership for Google users

    if (auth.type === 'google') {
      try {
        const session = await getServerSession(authOptions);
        if (session?.user?.email) {
          const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
          if (dbUser) {
            const parts = targetPath.split('/').filter(Boolean);
            const repo = parts[1] || 'GEU';
            
            const keepPaths = isSubjectFolder 
              ? [`${targetPath}/PYQ/.keep`, `${targetPath}/Notes/.keep`, `${targetPath}/Syllabus/.keep`]
              : [`${targetPath}/.keep`];

            for (const kp of keepPaths) {
              await prisma.fileOwnership.upsert({
                where: { filePath: kp },
                create: { userId: dbUser.id, userEmail: session.user.email, filePath: kp, repo },
                update: { userId: dbUser.id, userEmail: session.user.email, repo },
              });
            }
          }
        }
      } catch (e) {
        console.error('Folder ownership record failed (non-fatal):', e);
      }
    }

    return NextResponse.json({ success: true, path: targetPath });
  } catch (error: any) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create folder' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path } = await request.json();
    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // Google users can only delete files they uploaded
    if (auth.type === 'google') {
      const session = await getServerSession(authOptions);
      const email = session?.user?.email;
      if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const owns = await checkGoogleOwnership(email, path);
      if (!owns) {
        return NextResponse.json(
          { error: 'You can only delete files you uploaded. Link your GitHub account for full access.' },
          { status: 403 }
        );
      }
    }

    const tokenToUse = auth.type === 'github' ? auth.accessToken : undefined;
    await deleteItem(path, tokenToUse);

    // Remove ownership records when file is deleted
    if (auth.type === 'google') {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        await prisma.fileOwnership.deleteMany({
          where: { userEmail: session.user.email, filePath: { startsWith: path } },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete item' },
      { status: 500 }
    );
  }
}
