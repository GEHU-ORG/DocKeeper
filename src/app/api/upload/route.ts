import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/github';
import { getAuthContext } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const path = formData.get('path') as string | null;

    if (!file || !path) {
      return NextResponse.json({ error: 'File and path are required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const targetPath = path.startsWith('GEHU-ORG') ? path : `GEHU-ORG/${path}`;

    await uploadFile(targetPath, buffer);

    return NextResponse.json({ success: true, path: targetPath });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
