import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

const ORG_NAME = 'GEHU-ORG';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session as any)?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const octokit = new Octokit({ auth: (session as any).accessToken });
    const body = await req.json();
    const { action, id, sourceUrl, sourcePath, destinationPath, newName } = body;

    // Helper to extract repo and inner path from 'GEHU-ORG/Repo/Folder/File'
    const getRepoAndPath = (fullPath: string) => {
      const parts = fullPath.split('/').filter(Boolean);
      const repo = parts[1];
      const innerPath = parts.slice(2).join('/');
      return { repo, innerPath, filename: parts[parts.length - 1] };
    };

    if (action === 'rename' && sourcePath && newName) {
      const { repo, innerPath, filename } = getRepoAndPath(sourcePath);
      
      // 1. Get file content
      const { data: fileData } = await octokit.repos.getContent({
        owner: ORG_NAME,
        repo,
        path: innerPath,
      });

      if (!('content' in fileData)) {
        throw new Error('Not a file');
      }

      // 2. Create new file with new name
      const newInnerPath = innerPath.replace(filename, newName);
      await octokit.repos.createOrUpdateFileContents({
        owner: ORG_NAME,
        repo,
        path: newInnerPath,
        message: `Rename ${filename} to ${newName}`,
        content: fileData.content,
      });

      // 3. Delete old file
      await octokit.repos.deleteFile({
        owner: ORG_NAME,
        repo,
        path: innerPath,
        message: `Delete old file ${filename} after rename`,
        sha: fileData.sha,
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'move-file' && sourcePath && destinationPath) {
      const oldObj = getRepoAndPath(sourcePath);
      const newObj = getRepoAndPath(destinationPath);

      // 1. Get file content
      const { data: fileData } = await octokit.repos.getContent({
        owner: ORG_NAME,
        repo: oldObj.repo,
        path: oldObj.innerPath,
      });

      if (!('content' in fileData)) {
        throw new Error('Not a file');
      }

      // 2. Create new file
      await octokit.repos.createOrUpdateFileContents({
        owner: ORG_NAME,
        repo: newObj.repo,
        path: newObj.innerPath,
        message: `Move file to ${newObj.innerPath}`,
        content: fileData.content,
      });

      // 3. Delete old file
      await octokit.repos.deleteFile({
        owner: ORG_NAME,
        repo: oldObj.repo,
        path: oldObj.innerPath,
        message: `Delete old file after move`,
        sha: fileData.sha,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Error moving file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
