import { AuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';

export const authOptions: AuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      // Ask for org access if needed, or just default user email
      authorization: { params: { scope: 'read:user user:email' } },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-dev",
  callbacks: {
    async jwt({ token, profile }) {
      if (profile && 'login' in profile) {
        token.githubUsername = profile.login;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).githubUsername = token.githubUsername as string;
      }
      return session;
    }
  }
};

export async function getAuthContext() {
  const session = await getServerSession(authOptions);
  if (session?.user && (session.user as any).githubUsername) {
    return { type: 'github', value: (session.user as any).githubUsername };
  }
  
  const cookieStore = await cookies();
  const secretCode = cookieStore.get('secret_code')?.value;
  if (secretCode) {
    return { type: 'secret', value: secretCode };
  }
  
  return null;
}
