import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

const ORG_NAME = 'GEHU-ORG';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session as any)?.user?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { moves } = await req.json();
    if (!Array.isArray(moves)) {
      return NextResponse.json({ error: 'Invalid moves array' }, { status: 400 });
    }

    const octokit = new Octokit({ auth: (session as any).user.accessToken });
    
    const getRepoAndPath = (fullPath: string) => {
      const parts = fullPath.split('/').filter(Boolean);
      const repo = parts[1];
      const innerPath = parts.slice(2).join('/');
      return { repo, innerPath };
    };

    // Execute moves sequentially to avoid rate limits
    for (const move of moves) {
      const { old_path, new_path, sha } = move;
      if (!old_path || !new_path || !sha) continue;

      const oldObj = getRepoAndPath(old_path);
      const newObj = getRepoAndPath(new_path);

      if (oldObj.repo !== newObj.repo) {
        continue; // Cross-repo moves not supported in this simple logic
      }

      // 1. Get file content
      const { data: fileData } = await octokit.repos.getContent({
        owner: ORG_NAME,
        repo: oldObj.repo,
        path: oldObj.innerPath,
      });

      if (!('content' in fileData)) {
        continue;
      }

      // 2. Create at new path
      await octokit.repos.createOrUpdateFileContents({
        owner: ORG_NAME,
        repo: newObj.repo,
        path: newObj.innerPath,
        message: `Organize: move to ${newObj.innerPath}`,
        content: fileData.content,
      });

      // 3. Delete old file
      await octokit.repos.deleteFile({
        owner: ORG_NAME,
        repo: oldObj.repo,
        path: oldObj.innerPath,
        message: `Organize: delete old file`,
        sha: sha,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error executing AI plan:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute plan' }, { status: 500 });
  }
}
