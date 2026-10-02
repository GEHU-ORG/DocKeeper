import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
const ORG = 'UniExamPrep';

/**
 * GET /api/study/read?repo=GEU&path=.private/.../.chat
 * Returns the content of a .chat file (auth-gated to creator only)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const repo = searchParams.get('repo');
  const filePath = searchParams.get('path');

  if (!repo || !filePath) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  // Security: ensure the path belongs to this user
  const userId = session.user.id;
  if (!filePath.startsWith(`.private/${userId}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data } = await octokit.repos.getContent({ owner: ORG, repo, path: filePath });
    if ('content' in data) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return NextResponse.json({ content: JSON.parse(content) });
    }
    return NextResponse.json({ error: 'Not a file' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
