import { Octokit } from '@octokit/rest';

// Assuming GITHUB_PAT is set in .env
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
const ORG_NAME = 'GEHU-ORG';

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
  
  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'GEHU-ORG')) {
    // List repositories
    const { data } = await octokit.repos.listForOrg({ org: ORG_NAME, per_page: 100 });
    return data.map(repo => ({
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
        type: item.type === 'dir' ? 'folder' : 'file',
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

  // Get SHA
  const { data } = await client.repos.getContent({
    owner: ORG_NAME,
    repo,
    path: innerPath,
  });

  if (Array.isArray(data)) {
    throw new Error('Deleting folders is not supported. Please delete files individually.');
  }

  await client.repos.deleteFile({
    owner: ORG_NAME,
    repo,
    path: innerPath,
    message: `Delete ${innerPath} via GEHU-DocKeeper`,
    sha: data.sha,
  });
}

export async function uploadFile(path: string, content: string | Buffer, userToken?: string): Promise<void> {
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

  await client.repos.createOrUpdateFileContents({
    owner: ORG_NAME,
    repo,
    path: innerPath,
    message: `Upload ${innerPath} via GEHU-DocKeeper`,
    content: encodedContent,
    sha,
  });
}

export async function createFolder(path: string, userToken?: string): Promise<void> {
  // GitHub doesn't have true empty folders. Create a .keep file.
  await uploadFile(`${path}/.keep`, '', userToken);
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
    
    // Check if the most recent commit (or original commit) was authored by the user.
    // For simplicity, we check if the user's login is in the commit message
    // since we use a PAT and the API makes commits as the PAT owner (or App).
    // We will ensure our uploads put the username in the commit message.
    const latestCommitMsg = commits[0].commit.message;
    return latestCommitMsg.includes(`@${expectedUsername}`);
  } catch (e: any) {
    console.error('Error verifying ownership:', e);
    return false;
  }
}
