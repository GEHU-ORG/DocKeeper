import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/github';
import { getAuthContext } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const path = formData.get('path') as string | null;

    if (!file || !path) {
      return NextResponse.json({ error: 'File and path are required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const targetPath = path.startsWith('UniExamPrep') ? path : `UniExamPrep/${path}`;

    // Google-only users: use admin PAT (pass undefined so github.ts falls back to octokit)
    // GitHub users: use their own token
    const tokenToUse = auth.type === 'github' ? auth.accessToken : undefined;

    // Customise commit message with attribution
    const uploaderTag = auth.type === 'github'
      ? `@${auth.value}`
      : `${auth.value} (via Google)`;

    await uploadFile(targetPath, buffer, tokenToUse, uploaderTag);

    // Track ownership for non-GitHub users so they can delete/modify their own uploads
    if (auth.type === 'google') {
      try {
        const session = await getServerSession(authOptions);
        if (session?.user?.email) {
          const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
          if (dbUser) {
            const parts = targetPath.split('/').filter(Boolean);
            const repo = parts[1] || 'GEU';
            await prisma.fileOwnership.upsert({
              where: { filePath: targetPath },
              create: { userId: dbUser.id, userEmail: session.user.email, filePath: targetPath, repo },
              update: { userId: dbUser.id, userEmail: session.user.email, repo },
            });
          }
        }
      } catch (e) {
        console.error('Ownership record failed (non-fatal):', e);
      }
    }

    return NextResponse.json({ success: true, path: targetPath });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Permission denied. You must be a member of UniExamPrep to upload files.' },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
