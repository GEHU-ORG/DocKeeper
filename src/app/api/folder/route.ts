import { NextRequest, NextResponse } from 'next/server';
import { createFolder, deleteItem } from '@/lib/github';
import { getAuthContext } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, path } = await request.json();
    if (!name || typeof path !== 'string') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const targetPath = path === auth.value ? `GEHU-ORG/${name}` : `${path}/${name}`;

    await createFolder(targetPath, auth.accessToken);

    return NextResponse.json({ success: true, path: targetPath });
  } catch (error: any) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create folder' },
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

    const { id, path } = await request.json();
    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    await deleteItem(path, auth.accessToken);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
