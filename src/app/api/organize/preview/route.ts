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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY environment variable is missing.' }, { status: 500 });
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

    const files = data.filter(item => item.type === 'file').map(f => f.name);
    if (files.length === 0) {
      return NextResponse.json({ moves: [] });
    }

    // Call Gemini API via REST
    const prompt = `
You are an expert file organizer. Given the following list of files in a directory, group them into logical subfolders based on their purpose or type (e.g., 'Lectures', 'Assignments', 'Source Code', 'Assets').
Do not create too many folders; group similar things.

Files to organize:
${files.join('\n')}

Respond ONLY with a valid JSON array of objects. Do not include markdown blocks or any other text.
Format:
[
  { "filename": "example.pdf", "folder": "Documents" },
  { "filename": "script.js", "folder": "Source Code" }
]
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const result = await response.json();
    const textResponse = result.candidates[0].content.parts[0].text;
    const classifications = JSON.parse(textResponse);

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
