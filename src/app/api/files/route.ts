import { NextRequest, NextResponse } from 'next/server';
import { listItems } from '@/lib/github';
import { getAuthContext } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const query = searchParams.get('query') || '';

    // If query is provided, we would do a global search.
    // GitHub API doesn't support global search easily without Code Search API, 
    // so we'll skip global search for this simple professional implementation or just return empty.
    if (query) {
      return NextResponse.json({ items: [] });
    }

    // Default to listing GEHU-ORG if path is empty or matches email
    let targetPath = path;
    if (!targetPath || (auth && targetPath === auth.value)) {
       targetPath = 'GEHU-ORG';
    }

    const items = await listItems(targetPath);

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('Error in GET /api/files:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list files' },
      { status: 500 }
    );
  }
}
