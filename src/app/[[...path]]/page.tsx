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
  
  let isReadOnly = true;
  let username = '';

  if (session?.user && (session.user as any).githubUsername) {
    username = (session.user as any).githubUsername;
    const isMember = await checkOrgMembership(username);

    if (isMember) {
      isReadOnly = false;
    }
  }

  // Render the File Browser
  const { path } = await params;
  
  // Default to GEHU-ORG if no path (root)
  let fullPath = 'GEHU-ORG';
  if (path && path.length > 0) {
    fullPath = 'GEHU-ORG/' + path.map(decodeURIComponent).join('/');
  }

  return <FileBrowser initialPath={fullPath} isReadOnly={isReadOnly} isSignedIn={!!username} username={username} />;
}

export async function generateMetadata({ params }: BrowsePageProps): Promise<Metadata> {
  const { path } = await params;
  let folderName = 'GEHU-ORG Root';
  if (path && path.length > 0) {
    folderName = decodeURIComponent(path[path.length - 1]);
  }

  // Format the folder name to be more readable for SEO (e.g., "CN-LAB" -> "CN LAB")
  const readableName = folderName.replace(/-/g, ' ');

  return {
    title: `${readableName} Study Material & Notes`,
    description: `Download ${readableName} notes, syllabus, lab manuals, and study materials for Graphic Era Hill University (GEHU) BTech students. Free open-source resources.`,
    keywords: [
      `${readableName} GEHU`,
      `${readableName} notes`,
      `${readableName} syllabus`,
      `${readableName} BTech`,
      `GEHU Graphic Era ${readableName}`,
    ]
  };
}
