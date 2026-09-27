import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

const ORG_NAME = 'GEHU-ORG';

function getCategoryByExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return 'Others';

  const categories: Record<string, string[]> = {
    'Documents': ['pdf', 'doc', 'docx', 'txt', 'rtf', 'csv', 'xlsx', 'xls', 'ppt', 'pptx'],
    'Images': ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'],
    'Videos': ['mp4', 'mov', 'avi', 'mkv', 'webm'],
    'Audio': ['mp3', 'wav', 'ogg', 'm4a'],
    'Code': ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'md'],
    'Archives': ['zip', 'rar', 'tar', 'gz', '7z'],
  };

  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }

  return 'Others';
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session as any)?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path } = await req.json();
    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    const parts = path.split('/').filter(Boolean);
    if (parts.length < 2) {
      return NextResponse.json({ error: 'Cannot organize the root directory' }, { status: 400 });
    }

    const repo = parts[1];
    const innerPath = parts.slice(2).join('/');
    
    const octokit = new Octokit({ auth: (session as any).accessToken });
    
    // Fetch files in the current directory
    const { data } = await octokit.repos.getContent({
      owner: ORG_NAME,
      repo,
      path: innerPath,
    });

    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Not a directory' }, { status: 400 });
    }

    const moves = [];
    
    for (const item of data) {
      if (item.type === 'file') {
        const category = getCategoryByExtension(item.name);
        
        // If it's already in a folder named after a category, don't move it
        const currentFolder = innerPath.split('/').pop();
        if (currentFolder === category) continue;

        const newPath = innerPath 
          ? `${ORG_NAME}/${repo}/${innerPath}/${category}/${item.name}`
          : `${ORG_NAME}/${repo}/${category}/${item.name}`;

        const oldPath = innerPath
          ? `${ORG_NAME}/${repo}/${innerPath}/${item.name}`
          : `${ORG_NAME}/${repo}/${item.name}`;

        moves.push({
          old_path: oldPath,
          new_path: newPath,
          sha: item.sha,
          download_url: item.download_url
        });
      }
    }

    return NextResponse.json({ moves });
  } catch (error: any) {
    console.error('Error generating AI plan:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate plan' }, { status: 500 });
  }
}
