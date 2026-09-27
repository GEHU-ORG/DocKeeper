import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LandingPage } from '@/components/LandingPage';
import { checkOrgMembership } from '@/lib/github';
import { JoinOrgPrompt } from '@/components/JoinOrgPrompt';
import { FileBrowser } from '@/components/FileBrowser';
import { Metadata } from 'next';

interface BrowsePageProps {
  params: Promise<{ path?: string[] }>;
}

export default async function BrowsePage({ params }: BrowsePageProps) {
  const session = await getServerSession(authOptions);
  
  if (session?.user && (session.user as any).githubUsername) {
    const username = (session.user as any).githubUsername;
    const isMember = await checkOrgMembership(username);

    if (!isMember) {
      return <JoinOrgPrompt username={username} />;
    }

    // Authenticated and in org -> Render the File Browser
    const { path } = await params;
    
    // Default to GEHU-ORG if no path (root)
    // If they navigate to /MyRepo/Folder, path is ['MyRepo', 'Folder']
    let fullPath = 'GEHU-ORG';
    if (path && path.length > 0) {
      fullPath = 'GEHU-ORG/' + path.map(decodeURIComponent).join('/');
    }

    return <FileBrowser initialPath={fullPath} />;
  }

  // Not authenticated -> Render Landing Page
  return <LandingPage />;
}

export async function generateMetadata({ params }: BrowsePageProps): Promise<Metadata> {
  const { path } = await params;
  let folderName = 'GEHU-ORG Root';
  if (path && path.length > 0) {
    folderName = decodeURIComponent(path[path.length - 1]);
  }

  return {
    title: `${folderName} — GEHU DocKeeper`,
    description: `Browse documents in ${folderName}`,
  };
}
