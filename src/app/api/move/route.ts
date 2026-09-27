import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

const ORG_NAME = 'GEHU-ORG';
const MANAGED_REPOS = ['Syllabus-GEHU', 'PYQ-GEHU', 'NOTES-GEHU'];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session as any)?.user?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const octokit = new Octokit({ auth: (session as any).user.accessToken });
    const body = await req.json();
    const { action, id, sourceUrl, sourcePath, destinationPath, newName } = body;

    // Helper to extract repo and inner path from 'GEHU-ORG/Repo/Folder/File'
    const getRepoAndPath = (fullPath: string) => {
      const parts = fullPath.split('/').filter(Boolean);
      const repo = parts[1];
      const innerPath = parts.slice(2).join('/');
      return { repo, innerPath, filename: parts[parts.length - 1] };
    };

    if (action === 'list-folders') {
      const allFolders = ['GEHU-ORG'];

      await Promise.all(
        MANAGED_REPOS.map(async (repo) => {
          try {
            const { data: tree } = await octokit.git.getTree({
              owner: ORG_NAME,
              repo,
              tree_sha: 'main',
              recursive: '1',
            });
            const folderPaths = tree.tree
              .filter((item: any) => item.type === 'tree')
              .map((item: any) => `GEHU-ORG/${repo}/${item.path}`);
            
            allFolders.push(`GEHU-ORG/${repo}`);
            allFolders.push(...folderPaths);
          } catch (e) {
            console.error(`Failed to get tree for ${repo}`);
          }
        })
      );

      return NextResponse.json({ folders: allFolders });
    }

    if (action === 'move-folder') {
      return NextResponse.json({ error: 'Moving entire folders is not supported. Please create a new folder and move files individually.' }, { status: 400 });
    }

    if (action === 'rename' && sourcePath && newName) {
      const { repo, innerPath, filename } = getRepoAndPath(sourcePath);
      
      const { data: fileInfo } = await octokit.repos.getContent({
        owner: ORG_NAME,
        repo,
        path: innerPath,
      });

      if (Array.isArray(fileInfo) || !fileInfo.sha) throw new Error('Not a file');

      // Fetch blob to support large files (PDFs > 1MB)
      const { data: blobData } = await octokit.git.getBlob({
        owner: ORG_NAME,
        repo,
        file_sha: fileInfo.sha,
      });

      const newInnerPath = innerPath.substring(0, innerPath.length - filename.length) + newName;
      
      await octokit.repos.createOrUpdateFileContents({
        owner: ORG_NAME,
        repo,
        path: newInnerPath,
        message: `Rename ${filename} to ${newName}`,
        content: blobData.content,
      });

      await octokit.repos.deleteFile({
        owner: ORG_NAME,
        repo,
        path: innerPath,
        message: `Delete old file ${filename} after rename`,
        sha: fileInfo.sha,
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'move-file' && sourcePath && destinationPath) {
      const oldObj = getRepoAndPath(sourcePath);
      const newObj = getRepoAndPath(destinationPath);

      const { data: fileInfo } = await octokit.repos.getContent({
        owner: ORG_NAME,
        repo: oldObj.repo,
        path: oldObj.innerPath,
      });

      if (Array.isArray(fileInfo) || !fileInfo.sha) throw new Error('Not a file');

      // Fetch blob to support large files (PDFs > 1MB)
      const { data: blobData } = await octokit.git.getBlob({
        owner: ORG_NAME,
        repo: oldObj.repo,
        file_sha: fileInfo.sha,
      });

      await octokit.repos.createOrUpdateFileContents({
        owner: ORG_NAME,
        repo: newObj.repo,
        path: newObj.innerPath,
        message: `Move file to ${newObj.innerPath}`,
        content: blobData.content,
      });

      await octokit.repos.deleteFile({
        owner: ORG_NAME,
        repo: oldObj.repo,
        path: oldObj.innerPath,
        message: `Delete old file after move`,
        sha: fileInfo.sha,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Error moving/renaming item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
