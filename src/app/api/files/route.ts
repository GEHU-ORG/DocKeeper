import { NextRequest, NextResponse } from 'next/server';
import { listItems, searchItems, deleteItem, verifyFileOwnership } from '@/lib/github';
import { getAuthContext } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const query = searchParams.get('search') || searchParams.get('query') || '';

    // Default to listing GEHU-ORG if path is empty or matches email
    let targetPath = path;
    if (!targetPath || (auth && targetPath === auth.value)) {
       targetPath = 'GEHU-ORG';
    }

    if (query) {
      const items = await searchItems(targetPath, query);
      return NextResponse.json({ items });
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

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path } = await request.json();
    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    const parts = path.split('/').filter(Boolean);
    if (parts.length < 3) {
      return NextResponse.json({ error: 'Invalid path format' }, { status: 400 });
    }
    
    const repo = parts[1];
    const innerPath = parts.slice(2).join('/');

    // Check if the user is the one who uploaded the file
    // username is stored in auth.value (e.g. from GitHub OAuth login)
    const isOwner = await verifyFileOwnership(repo, innerPath, auth.value);
    
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Permission denied: You can only delete files that you uploaded.' },
        { status: 403 }
      );
    }

    await deleteItem(path, auth.accessToken);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}
