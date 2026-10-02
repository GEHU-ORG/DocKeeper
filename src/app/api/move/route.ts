import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

const ORG_NAME = 'UniExamPrep';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, id, sourceUrl, sourcePath, destinationPath, newName } = body;

    // migrate-cross-repo uses admin PAT only — no user session needed
    if (action !== 'migrate-cross-repo') {
      const session = await getServerSession(authOptions);
      if (!(session as any)?.user?.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const session = action !== 'migrate-cross-repo' ? await getServerSession(authOptions) : null;
    const octokit = new Octokit({ auth: (session as any)?.user?.accessToken || process.env.GITHUB_PAT });

    // Helper to extract repo and inner path from 'UniExamPrep/Repo/Folder/File'
    const getRepoAndPath = (fullPath: string) => {
      const parts = fullPath.split('/').filter(Boolean);
      const repo = parts[1];
      const innerPath = parts.slice(2).join('/');
      return { repo, innerPath, filename: parts[parts.length - 1] };
    };

    if (action === 'list-folders') {
      const allFolders = ['UniExamPrep'];

      const { data: reposList } = await octokit.repos.listForOrg({ org: ORG_NAME, per_page: 100 });
      const managedRepos = reposList
        .filter(r => !['UniExamPrep', '.github'].includes(r.name))
        .map(r => r.name);

      await Promise.all(
        managedRepos.map(async (repo) => {
          allFolders.push(`UniExamPrep/${repo}`);
          try {
            const { data: tree } = await octokit.git.getTree({
              owner: ORG_NAME,
              repo,
              tree_sha: 'main',
              recursive: '1',
            });
            const folderPaths = tree.tree
              .filter((item: any) => item.type === 'tree')
              .map((item: any) => `UniExamPrep/${repo}/${item.path}`);
            
            allFolders.push(...folderPaths);
          } catch (e) {
            console.error(`Failed to get tree for ${repo}`);
          }
        })
      );

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
    }

    // Admin-only: migrate files from a source repo/path into a destination repo/path
    if (action === 'migrate-cross-repo') {
      const adminPat = process.env.GITHUB_PAT;
      if (!adminPat) return NextResponse.json({ error: 'No admin PAT configured' }, { status: 500 });

      const adminOctokit = new Octokit({ auth: adminPat });
      const { sourceRepo, sourceFolderPath, destRepo, destFolderPath } = body;

      // 1. Get source tree
      const { data: srcRef } = await adminOctokit.git.getRef({ owner: ORG_NAME, repo: sourceRepo, ref: 'heads/main' });
      const { data: srcTree } = await adminOctokit.git.getTree({ owner: ORG_NAME, repo: sourceRepo, tree_sha: srcRef.object.sha, recursive: '1' });

      const prefix = sourceFolderPath ? sourceFolderPath + '/' : '';
      const blobs = srcTree.tree.filter((t: any) => t.type === 'blob' && (!prefix || t.path?.startsWith(prefix)));

      if (blobs.length === 0) return NextResponse.json({ error: 'No files found in source path', path: sourceFolderPath }, { status: 404 });

      // 2. Get dest tree base
      const { data: dstRef } = await adminOctokit.git.getRef({ owner: ORG_NAME, repo: destRepo, ref: 'heads/main' });
      const { data: dstCommit } = await adminOctokit.git.getCommit({ owner: ORG_NAME, repo: destRepo, commit_sha: dstRef.object.sha });

      // 3. Fetch each blob from source and create new blob in dest (required for cross-repo copy)
      const treeNodes: any[] = [];
      for (const b of blobs) {
        const relativePath = prefix ? b.path!.substring(prefix.length) : b.path!;
        const filename = relativePath.split('/').pop()!;
        if (!filename || filename === '.keep' || filename === '.gitkeep' || filename === '.gitignore') continue;

        // Fetch blob content from source repo
        const { data: blobData } = await adminOctokit.git.getBlob({ owner: ORG_NAME, repo: sourceRepo, file_sha: b.sha! });

        // Create new blob in dest repo
        const { data: newBlob } = await adminOctokit.git.createBlob({
          owner: ORG_NAME,
          repo: destRepo,
          content: blobData.content,
          encoding: 'base64',
        });

        treeNodes.push({
          path: `${destFolderPath}/${filename}`,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: newBlob.sha,
        });
      }

      if (treeNodes.length === 0) return NextResponse.json({ success: true, filesMoved: 0 });

      // 4. Create new tree in dest repo
      const { data: newTree } = await adminOctokit.git.createTree({
        owner: ORG_NAME,
        repo: destRepo,
        base_tree: dstCommit.tree.sha,
        tree: treeNodes,
      });

      // 5. Commit and update ref
      const { data: newCommit } = await adminOctokit.git.createCommit({
        owner: ORG_NAME,
        repo: destRepo,
        message: `Migrate ${treeNodes.length} files from ${sourceRepo}/${sourceFolderPath} to ${destFolderPath}`,
        tree: newTree.sha,
        parents: [dstRef.object.sha],
      });

      await adminOctokit.git.updateRef({ owner: ORG_NAME, repo: destRepo, ref: 'heads/main', sha: newCommit.sha });

      return NextResponse.json({ success: true, filesMoved: treeNodes.length });
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
