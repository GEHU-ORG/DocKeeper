import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LandingPage } from '@/components/LandingPage';
import { redirect } from 'next/navigation';
import { checkOrgMembership } from '@/lib/github';
import { JoinOrgPrompt } from '@/components/JoinOrgPrompt';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  
  if (session?.user && (session.user as any).githubUsername) {
    const username = (session.user as any).githubUsername;
    const isMember = await checkOrgMembership(username);

    if (isMember) {
      redirect(`/browse/GEHU-ORG`);
    } else {
      return <JoinOrgPrompt username={username} />;
    }
  }

  return <LandingPage />;
}
