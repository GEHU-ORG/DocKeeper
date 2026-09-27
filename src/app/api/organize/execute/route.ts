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

    const results = { successful: 0, failed: 0, errors: [] as string[] };

    // Execute moves sequentially to avoid rate limits
    for (const move of moves) {
      try {
        const { old_path, new_path, sha, download_url } = move;
        if (!old_path || !new_path || !sha) continue;

        const oldObj = getRepoAndPath(old_path);
        const newObj = getRepoAndPath(new_path);

        if (oldObj.repo !== newObj.repo) {
          throw new Error('Cross-repo moves not supported');
        }

        // 1. Get file content
        const { data: fileData } = await octokit.repos.getContent({
          owner: ORG_NAME,
          repo: oldObj.repo,
          path: oldObj.innerPath,
        });

        let fileContent = '';
        if ('content' in fileData && fileData.content) {
          fileContent = fileData.content;
        } else if (download_url) {
          // File > 1MB, fetch from download_url and encode
          const res = await fetch(download_url);
          const arrayBuffer = await res.arrayBuffer();
          fileContent = Buffer.from(arrayBuffer).toString('base64');
        } else {
          throw new Error('Could not fetch file content');
        }

        // 2. Create at new path
        await octokit.repos.createOrUpdateFileContents({
          owner: ORG_NAME,
          repo: newObj.repo,
          path: newObj.innerPath,
          message: `Organize: move to ${newObj.innerPath}`,
          content: fileContent,
        });

        // 3. Delete old file
        await octokit.repos.deleteFile({
          owner: ORG_NAME,
          repo: oldObj.repo,
          path: oldObj.innerPath,
          message: `Organize: delete old file`,
          sha: sha,
        });

        results.successful++;
      } catch (err: any) {
        console.error(`Failed to move ${move.old_path}:`, err);
        results.failed++;
        results.errors.push(`Failed to move ${move.old_path}: ${err.message}`);
      }
    }

    if (results.failed > 0 && results.successful === 0) {
      return NextResponse.json({ error: 'All moves failed', details: results.errors }, { status: 500 });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Error executing AI plan:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute plan' }, { status: 500 });
  }
}
