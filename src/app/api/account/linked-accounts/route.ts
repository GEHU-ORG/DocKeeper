import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ github: false, google: false });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { accounts: { select: { provider: true } } },
    });

    const providers = user?.accounts.map(a => a.provider) ?? [];

    return NextResponse.json({
      github: providers.includes('github'),
      google: providers.includes('google'),
    });
  } catch {
    return NextResponse.json({ github: false, google: false });
  }
}
