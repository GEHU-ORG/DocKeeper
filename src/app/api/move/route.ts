import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

const ORG_NAME = 'UniExamPrep';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, id, sourceUrl, sourcePath, destinationPath, newName } = body;

    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    // Allow GitHub users (have accessToken) AND Google-authenticated users
    const isGoogleUser = session?.user && !user?.githubUsername;
    const hasAccess = user?.accessToken || isGoogleUser;
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // GitHub users use their token; Google users fall through to admin PAT
    const userToken = user?.accessToken;
    const octokit = new Octokit({ auth: userToken || process.env.GITHUB_PAT });

    // Helper to extract repo and inner path from 'UniExamPrep/Repo/Folder/File'
    const getRepoAndPath = (fullPath: string) => {
      const parts = fullPath.split('/').filter(Boolean);
      const repo = parts[1];
      const innerPath = parts.slice(2).join('/');
      return { repo, innerPath, filename: parts[parts.length - 1] };
    };

    if (action === 'list-folders') {
      const allFolders = ['UniExamPrep', 'UniExamPrep/GEU'];

      try {
        const { data: tree } = await octokit.git.getTree({
          owner: ORG_NAME,
          repo: 'GEU',
          tree_sha: 'main',
          recursive: '1',
        });
        const folderPaths = tree.tree
          .filter((item: any) => item.type === 'tree')
          .map((item: any) => `UniExamPrep/GEU/${item.path}`);
        
        allFolders.push(...folderPaths);
      } catch (e) {
        console.error('Failed to get tree for GEU:', e);
      }

      return NextResponse.json({ folders: allFolders });
    }

    if (action === 'move-folder') {
      const oldObj = getRepoAndPath(sourcePath);
      const newObj = getRepoAndPath(destinationPath);

      if (oldObj.repo !== newObj.repo) {
        return NextResponse.json(
          { error: 'Moving folders across different repositories (e.g. Notes to Syllabus) is not supported. Please create a new folder and move the files individually.' },
          { status: 400 }
        );
      }

      const repo = oldObj.repo;

      // 1. Get branch reference
      const { data: ref } = await octokit.git.getRef({
        owner: ORG_NAME,
        repo,
        ref: 'heads/main',
      });
      const latestCommitSha = ref.object.sha;

      // 2. Get the commit to find the base tree
      const { data: commit } = await octokit.git.getCommit({
        owner: ORG_NAME,
        repo,
        commit_sha: latestCommitSha,
      });
      const baseTreeSha = commit.tree.sha;

      // 3. Fetch recursive tree
      const { data: fullTree } = await octokit.git.getTree({
         owner: ORG_NAME,
         repo,
         tree_sha: baseTreeSha,
         recursive: '1',
      });

      // Find all blobs that are inside the source folder
      const prefix = oldObj.innerPath + '/';
      const treeUpdates: any[] = [];

      for (const item of fullTree.tree) {
         if (item.type === 'blob' && item.path?.startsWith(prefix)) {
            // Delete old file
            treeUpdates.push({
               path: item.path,
               mode: '100644',
               type: 'blob',
               sha: null,
            });

            // Create new file at destination
            const newRelativePath = item.path.substring(prefix.length);
            treeUpdates.push({
               path: `${newObj.innerPath}/${newRelativePath}`,
               mode: item.mode || '100644',
               type: 'blob',
               sha: item.sha,
            });
         }
      }

      if (treeUpdates.length === 0) {
        return NextResponse.json({ error: 'Folder is empty or does not exist.' }, { status: 400 });
      }

      // 4. Create new tree
      const { data: newTree } = await octokit.git.createTree({
         owner: ORG_NAME,
         repo,
         base_tree: baseTreeSha,
         tree: treeUpdates,
      });

      // 5. Create new commit
      const { data: newCommit } = await octokit.git.createCommit({
         owner: ORG_NAME,
         repo,
         message: `Move folder ${oldObj.innerPath} to ${newObj.innerPath}`,
         tree: newTree.sha,
         parents: [latestCommitSha],
      });

      // 6. Update reference
      await octokit.git.updateRef({
         owner: ORG_NAME,
         repo,
         ref: 'heads/main',
         sha: newCommit.sha,
      });

      return NextResponse.json({ success: true });
    } // (Temporary migration logic removed)

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
