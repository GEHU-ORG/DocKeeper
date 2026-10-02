import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

const ORG_NAME = 'UniExamPrep';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session as any)?.user?.accessToken) {
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
    
    const octokit = new Octokit({ auth: (session as any).user.accessToken });
    
    // Fetch files in the current directory
    const { data } = await octokit.repos.getContent({
      owner: ORG_NAME,
      repo,
      path: innerPath,
    });

    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Not a directory' }, { status: 400 });
    }

    const files = data.filter(item => item.type === 'file').map(f => f.name);
    if (files.length === 0) {
      return NextResponse.json({ moves: [] });
    }

    // Call Pollinations free LLM API
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are an expert file organizer. Given a list of files, group them into logical folders based on purpose or type (e.g., "Documents", "Images", "Code"). Respond ONLY with a valid, raw JSON array of objects without markdown tags. Format: [{"filename":"name","folder":"category"}]'
          },
          {
            role: 'user',
            content: files.join(', ')
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const textResponse = await response.text();
    let classifications = [];
    try {
      classifications = JSON.parse(textResponse.trim());
    } catch (e) {
      console.log('Failed to parse JSON, raw text was:', textResponse);
      throw new Error('AI returned invalid JSON');
    }

    const moves = [];
    for (const item of data) {
      if (item.type === 'file') {
        const classification = classifications.find((c: any) => c.filename === item.name);
        if (!classification || !classification.folder) continue;
        
        const category = classification.folder;
        const currentFolder = innerPath.split('/').pop();
        if (currentFolder === category) continue; // Already in right place

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
