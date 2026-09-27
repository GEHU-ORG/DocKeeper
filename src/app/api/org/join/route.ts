import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { inviteToOrg } from '@/lib/github';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const auth = await getAuthContext();
    if (!auth || auth.type !== 'github') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await inviteToOrg(auth.value);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error inviting to org:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
