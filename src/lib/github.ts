import { Octokit } from '@octokit/rest';

// Assuming GITHUB_PAT is set in .env
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
const ORG_NAME = 'UniExamPrep';

export interface FileItem {
  id?: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  url?: string;
  size?: number;
  uploadedAt?: Date;
  sha?: string;
}

export async function listItems(path: string): Promise<FileItem[]> {
  const parts = path.split('/').filter(Boolean);
  
  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'UniExamPrep')) {
    // List repositories
    const { data } = await octokit.repos.listForOrg({ org: ORG_NAME, per_page: 100 });
    return data
      .filter(repo => !['UniExamPrep', '.github', 'Notes', 'PYQ', 'Syllabus', 'NOTES-GEHU', 'PYQ-GEHU'].includes(repo.name))
      .map(repo => ({
      id: repo.node_id,
      name: repo.name,
      type: 'folder',
      path: `${ORG_NAME}/${repo.name}`,
      uploadedAt: new Date(repo.updated_at || repo.created_at || Date.now()),
    }));
  }

  // Listing contents inside a repository
  const repo = parts[1];
  const innerPath = parts.slice(2).join('/');
  
  try {
    const { data } = await octokit.repos.getContent({
      owner: ORG_NAME,
      repo,
      path: innerPath,
    });

    if (Array.isArray(data)) {
      return data.map(item => ({
        id: item.sha,
        name: item.name,
        type: (item.type === 'dir' ? 'folder' : 'file') as 'folder' | 'file',
        path: `${ORG_NAME}/${repo}/${item.path}`,
        url: item.download_url || undefined,
        size: item.size,
        sha: item.sha,
      })).sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    } else {
      // It's a single file
      return [{
        id: data.sha,
        name: data.name,
        type: 'file',
        path: `${ORG_NAME}/${repo}/${data.path}`,
        url: data.download_url || undefined,
        size: data.size,
        sha: data.sha,
      }];
    }
  } catch (e: any) {
    if (e.status === 404) return [];
    throw e;
  }
}

export async function searchItems(path: string, query: string): Promise<FileItem[]> {
  const parts = path.split('/').filter(Boolean);
  const q = query.toLowerCase();
  
  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'UniExamPrep')) {
    // Search repositories by name
    const { data } = await octokit.repos.listForOrg({ org: ORG_NAME, per_page: 100 });
    return data
      .filter(repo => !['UniExamPrep', '.github', 'Notes', 'PYQ', 'Syllabus', 'NOTES-GEHU', 'PYQ-GEHU'].includes(repo.name))
      .filter(repo => repo.name.toLowerCase().includes(q))
      .map(repo => ({
        id: repo.node_id,
        name: repo.name,
        type: 'folder',
        path: `${ORG_NAME}/${repo.name}`,
        uploadedAt: new Date(repo.updated_at || repo.created_at || Date.now()),
      }));
  }

  // Searching contents inside a repository using recursive Tree API
  const repo = parts[1];
  const innerPath = parts.slice(2).join('/');
  
  try {
    const { data: repoData } = await octokit.repos.get({ owner: ORG_NAME, repo });
    const defaultBranch = repoData.default_branch;

    const { data: treeData } = await octokit.git.getTree({
      owner: ORG_NAME,
      repo,
      tree_sha: defaultBranch,
      recursive: '1'
    });

    const results: FileItem[] = [];
    
    for (const item of treeData.tree) {
      if (!item.path) continue;
      
      // Enforce search scope if inside a subfolder
      if (innerPath && !item.path.startsWith(innerPath + '/')) {
        continue;
      }
      
      const filename = item.path.split('/').pop() || '';
      if (filename.toLowerCase().includes(q)) {
        const downloadUrl = item.type === 'blob' 
          ? `https://raw.githubusercontent.com/${ORG_NAME}/${repo}/${defaultBranch}/${item.path}`
          : undefined;

        results.push({
          id: item.sha || item.path,
          name: filename,
          type: item.type === 'tree' ? 'folder' : 'file',
          path: `${ORG_NAME}/${repo}/${item.path}`,
          url: downloadUrl,
          size: item.size,
          sha: item.sha,
        });
      }
    }
    
    // Sort results by type (folders first) and then name
    return results.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch (e) {
    console.error('Search failed:', e);
    return [];
  }
}

export async function deleteItem(path: string, userToken?: string): Promise<void> {
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 2) throw new Error('Cannot delete organization or root');
  
  const repo = parts[1];
  const innerPath = parts.slice(2).join('/');
  
  if (!innerPath) {
     throw new Error('Deleting repositories is not supported via this UI');
  }

  // Use the user's token for authorization, or fallback to the admin token (not recommended)
  const client = userToken ? new Octokit({ auth: userToken }) : octokit;

  let isFolder = false;
  let fileSha = '';

  try {
    const { data } = await client.repos.getContent({
      owner: ORG_NAME,
      repo,
      path: innerPath,
    });
    
    if (Array.isArray(data)) {
      isFolder = true;
    } else {
      fileSha = (data as any).sha;
    }
  } catch (e: any) {
    if (e.status === 404) {
      // It's possible the folder exists but has > 1000 items, or it's purely a tree.
      // getContent on a large dir might fail, but let's assume it's a folder if it's not a file.
      isFolder = true;
    } else {
      throw e;
    }
  }

  if (isFolder) {
    const { data: ref } = await client.git.getRef({ owner: ORG_NAME, repo, ref: 'heads/main' });
    const latestCommitSha = ref.object.sha;

    const { data: commit } = await client.git.getCommit({ owner: ORG_NAME, repo, commit_sha: latestCommitSha });
    const baseTreeSha = commit.tree.sha;

    const { data: fullTree } = await client.git.getTree({ owner: ORG_NAME, repo, tree_sha: baseTreeSha, recursive: '1' });
    const prefix = innerPath + '/';
    const treeUpdates: any[] = [];
    
    for (const item of fullTree.tree) {
      if (item.path?.startsWith(prefix) || item.path === innerPath) {
        treeUpdates.push({
          path: item.path,
          mode: '100644', 
          type: item.type === 'tree' ? 'tree' : 'blob',
          sha: null,
        });
      }
    }

    if (treeUpdates.length === 0) return; // Nothing to delete

    const { data: newTree } = await client.git.createTree({ owner: ORG_NAME, repo, base_tree: baseTreeSha, tree: treeUpdates });
    const { data: newCommit } = await client.git.createCommit({ owner: ORG_NAME, repo, message: `Delete folder ${innerPath} via UniExamPrep`, tree: newTree.sha, parents: [latestCommitSha] });
    await client.git.updateRef({ owner: ORG_NAME, repo, ref: 'heads/main', sha: newCommit.sha });
  } else {
    await client.repos.deleteFile({
      owner: ORG_NAME,
      repo,
      path: innerPath,
      message: `Delete ${innerPath} via UniExamPrep`,
      sha: fileSha,
    });
  }
}

export async function uploadFile(path: string, content: string | Buffer, userToken?: string, uploaderTag?: string): Promise<void> {
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 2) throw new Error('Cannot upload to root');
  const repo = parts[1];
  const innerPath = parts.slice(2).join('/');

  const client = userToken ? new Octokit({ auth: userToken }) : octokit;

  let sha: string | undefined;
  try {
    const { data } = await client.repos.getContent({
      owner: ORG_NAME,
      repo,
      path: innerPath,
    });
    if (!Array.isArray(data)) {
      sha = data.sha;
    }
  } catch (e: any) {
    if (e.status !== 404) throw e;
  }

  const encodedContent = typeof content === 'string' 
    ? Buffer.from(content).toString('base64')
    : content.toString('base64');

  const commitMsg = uploaderTag
    ? `Upload ${innerPath} by ${uploaderTag}`
    : `Upload ${innerPath} via UniExamPrep`;

  await client.repos.createOrUpdateFileContents({
    owner: ORG_NAME,
    repo,
    path: innerPath,
    message: commitMsg,
    content: encodedContent,
    sha,
  });
}


export async function createFolder(path: string, userToken?: string): Promise<void> {
  // GitHub doesn't have true empty folders. Create a .keep file.
  await uploadFile(`${path}/.keep`, '', userToken);
}

export async function createFolderTree(repo: string, paths: string[], userToken?: string): Promise<void> {
  const client = userToken ? new Octokit({ auth: userToken }) : octokit;

  try {
    // Get the latest commit SHA of the default branch
    const { data: refData } = await client.git.getRef({
      owner: ORG_NAME,
      repo,
      ref: 'heads/main'
    }).catch(() => client.git.getRef({
      owner: ORG_NAME,
      repo,
      ref: 'heads/master'
    }));

    const latestCommitSha = refData.object.sha;
    
    // Get the tree SHA of the latest commit
    const { data: commitData } = await client.git.getCommit({
      owner: ORG_NAME,
      repo,
      commit_sha: latestCommitSha
    });
    
    const baseTreeSha = commitData.tree.sha;

    // Create new tree object with our folders (.keep files)
    const treeNodes = paths.map(path => ({
      path: `${path}/.keep`,
      mode: '100644' as const,
      type: 'blob' as const,
      content: ''
    }));

    const { data: newTree } = await client.git.createTree({
      owner: ORG_NAME,
      repo,
      base_tree: baseTreeSha,
      tree: treeNodes
    });

    // Create a new commit
    const { data: newCommit } = await client.git.createCommit({
      owner: ORG_NAME,
      repo,
      message: 'Initialize standard university folder structure',
      tree: newTree.sha,
      parents: [latestCommitSha]
    });

    // Update the reference to point to the new commit
    await client.git.updateRef({
      owner: ORG_NAME,
      repo,
      ref: refData.ref.replace('refs/', ''),
      sha: newCommit.sha
    });

  } catch (error) {
    console.error('Failed to create folder tree in bulk:', error);
    throw error;
  }
}

export async function createRepository(repoName: string, description: string = ''): Promise<void> {
  await octokit.repos.createInOrg({
    org: ORG_NAME,
    name: repoName,
    description,
    private: false,
    auto_init: true,
  });
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : '';
}

export function getFileCategory(filename: string): string {
  const ext = getFileExtension(filename);
  const categories: Record<string, string[]> = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'],
    video: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v'],
    audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'],
    pdf: ['pdf'],
    document: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'],
    text: ['txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml', 'ini', 'cfg'],
    code: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'css', 'html', 'sql', 'sh', 'bash', 'rb', 'go', 'rs', 'swift', 'kt'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
  };

  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(ext)) return category;
  }
  return 'other';
}

export function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export async function checkOrgMembership(username: string): Promise<boolean> {
  try {
    await octokit.orgs.checkMembershipForUser({
      org: ORG_NAME,
      username,
    });
    return true;
  } catch (error: any) {
    if (error.status === 404) {
      return false;
    }
    // Handle other errors (e.g. rate limit, bad PAT)
    console.error('Error checking org membership:', error);
    return false;
  }
}

export async function inviteToOrg(username: string): Promise<void> {
  // Check if they already have an invitation
  const invitations = await octokit.orgs.listPendingInvitations({
    org: ORG_NAME,
  });
  const alreadyInvited = invitations.data.some(inv => inv.login === username);
  if (!alreadyInvited) {
    // Send invitation (requires admin PAT for the org)
    // We get the user ID first
    const { data: user } = await octokit.users.getByUsername({ username });
    await octokit.orgs.createInvitation({
      org: ORG_NAME,
      invitee_id: user.id,
      role: 'direct_member',
    });
  }
}

export async function verifyFileOwnership(repo: string, innerPath: string, expectedUsername: string): Promise<boolean> {
  try {
    // Get commit history for the file
    const { data: commits } = await octokit.repos.listCommits({
      owner: ORG_NAME,
      repo,
      path: innerPath,
      per_page: 5,
    });

    if (commits.length === 0) return false;
    
    // Check if the most recent commit was authored by the user via GitHub OAuth token.
    const latestCommit = commits[0];
    const authorLogin = latestCommit.author?.login || '';
    
    if (authorLogin.toLowerCase() === expectedUsername.toLowerCase()) {
      return true;
    }

    // Fallback: Check if the user's login is in the commit message
    const latestCommitMsg = latestCommit.commit.message;
    return latestCommitMsg.includes(`@${expectedUsername}`);
  } catch (e: any) {
    console.error('Error verifying ownership:', e);
    return false;
  }
}
