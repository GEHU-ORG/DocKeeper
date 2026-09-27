import { NextResponse } from 'next/server';
import { checkOrgMembership } from '@/lib/github';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (session?.user && (session.user as any).githubUsername) {
    const username = (session.user as any).githubUsername;
    const isMember = await checkOrgMembership(username);
    return NextResponse.json({ isMember });
  }

  return NextResponse.json({ isMember: false });
}
