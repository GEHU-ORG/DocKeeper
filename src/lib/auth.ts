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
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-dev",
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
      }
      if (profile && 'login' in profile) {
        token.githubUsername = profile.login;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).githubUsername = token.githubUsername;
        (session.user as any).accessToken = token.accessToken;
      }
      return session;
    }
  }
};

export async function getAuthContext() {
  const session = await getServerSession(authOptions);
  if (session?.user && (session.user as any).githubUsername) {
    return { 
      type: 'github', 
      value: (session.user as any).githubUsername as string,
      accessToken: (session.user as any).accessToken as string,
    };
  }
  
  const cookieStore = await cookies();
  const secretCode = cookieStore.get('secret_code')?.value;
  if (secretCode) {
    return { type: 'secret', value: secretCode };
  }
  
  return null;
}
