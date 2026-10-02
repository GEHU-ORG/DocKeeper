import { AuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      authorization: { params: { scope: 'read:user user:email repo' } },
      // Allow same email across GitHub + Google
      allowDangerousEmailAccountLinking: true,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      // Allow same email across GitHub + Google
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-dev",
  session: { strategy: "jwt" },
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // On sign-in, persist access token
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }

      // Prioritize GitHub: set githubUsername if signing in via GitHub
      if (profile && 'login' in profile) {
        token.githubUsername = (profile as any).login;
      }

      // If signing in via Google (no githubUsername yet), look up linked GitHub account in DB
      if (account?.provider === 'google' && !token.githubUsername && (user?.email || token.email)) {
        try {
          const email = user?.email || token.email as string;
          const dbUser = await prisma.user.findUnique({
            where: { email },
            include: { accounts: { where: { provider: 'github' } } },
          });
          if (dbUser?.accounts?.[0]) {
            // Fetch GitHub username from GitHub API using stored providerAccountId
            const githubId = dbUser.accounts[0].providerAccountId;
            const ghRes = await fetch(`https://api.github.com/user/${githubId}`, {
              headers: { Authorization: `token ${process.env.GITHUB_PAT}` }
            });
            if (ghRes.ok) {
              const ghUser = await ghRes.json();
              token.githubUsername = ghUser.login;
            }
          }
        } catch { /* ignore - GitHub not linked yet */ }
      }

      // Store email in token for lookups
      if (user?.email) token.email = user.email;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).githubUsername = token.githubUsername || null;
        (session.user as any).accessToken = token.accessToken;
        (session.user as any).provider = token.provider;
        (session.user as any).hasGitHub = !!token.githubUsername;
      }
      return session;
    }
  }
};

export async function getAuthContext() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const githubUsername = (session.user as any).githubUsername as string | undefined;
    if (githubUsername) {
      return { 
        type: 'github' as const,
        value: githubUsername,
        accessToken: (session.user as any).accessToken as string,
      };
    }
    // Google-only user: authenticated but no GitHub linked yet
    // Can browse and use study features, but can't upload/commit
    if (session.user.email) {
      return {
        type: 'google' as const,
        value: session.user.email,
        accessToken: null as unknown as string,
      };
    }
  }
  
  const cookieStore = await cookies();
  const secretCode = cookieStore.get('secret_code')?.value;
  if (secretCode) {
    return { type: 'secret' as const, value: secretCode, accessToken: null as unknown as string };
  }
  
  return null;
}

