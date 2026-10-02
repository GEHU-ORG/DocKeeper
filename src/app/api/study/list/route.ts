import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
const ORG = 'UniExamPrep';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = ((session.user as any).githubUsername ?? session.user.email ?? 'anonymous') as string;

  const { searchParams } = new URL(req.url);
  const repo = searchParams.get('repo');
  const subjectPath = searchParams.get('subjectPath');
  if (!repo || !subjectPath) return NextResponse.json({ error: 'Missing repo or subjectPath' }, { status: 400 });

  const basePath = `.private/${userId}/${subjectPath}`;

  try {
    const { data: ref } = await octokit.git.getRef({ owner: ORG, repo, ref: 'heads/main' });
    const { data: tree } = await octokit.git.getTree({ owner: ORG, repo, tree_sha: ref.object.sha, recursive: '1' });

    const privateBlobs = tree.tree.filter(
      (t) => t.type === 'blob' && t.path?.startsWith(basePath + '/') && !t.path.endsWith('.keep')
    );

    const onePagers = privateBlobs
      .filter((b) => b.path?.includes('/OnePagers/'))
      .map((b) => ({ path: b.path!, sha: b.sha!, name: b.path!.split('/').pop()! }));

    const studyNotes = privateBlobs
      .filter((b) => b.path?.includes('/StudyNotes/') && b.path.endsWith('.chat'))
      .map((b) => ({ path: b.path!, sha: b.sha!, name: b.path!.split('/').pop()! }));

    return NextResponse.json({ onePagers, studyNotes });
  } catch {
    return NextResponse.json({ onePagers: [], studyNotes: [] });
  }
}
