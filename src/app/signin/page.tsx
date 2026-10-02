'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import Link from 'next/link';

function SignInContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  useEffect(() => {
    if (status === 'authenticated') router.replace(callbackUrl);
  }, [status, router, callbackUrl]);

  const errorMessages: Record<string, string> = {
    OAuthAccountNotLinked: 'This email is already linked to a different provider. Try signing in with the other method.',
    AccessDenied: 'Access denied. Please try again.',
    default: 'Something went wrong. Please try again.',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
              UniExamPrep
            </h1>
          </Link>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Sign in to access study tools, upload notes & more
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
            color: '#ef4444', fontSize: '0.875rem', textAlign: 'center',
          }}>
            {errorMessages[error] || errorMessages.default}
          </div>
        )}

        {/* Card */}
        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 700, textAlign: 'center' }}>
            Welcome back 👋
          </h2>
          <p style={{ margin: '0 0 28px', color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
            Choose how you&apos;d like to sign in
          </p>

          {/* GitHub */}
          <button
            id="signin-github"
            onClick={() => signIn('github', { callbackUrl })}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              padding: '13px 20px', borderRadius: '10px', border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', marginBottom: '12px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'; (e.currentTarget as HTMLElement).style.borderColor = '#6e40c9'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'; }}
          >
            {/* GitHub icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>

          {/* Google */}
          <button
            id="signin-google"
            onClick={() => signIn('google', { callbackUrl })}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              padding: '13px 20px', borderRadius: '10px', border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', marginBottom: '24px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'; (e.currentTarget as HTMLElement).style.borderColor = '#4285f4'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'; }}
          >
            {/* Google icon */}
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            By signing in you agree to our{' '}
            <span style={{ color: 'var(--accent)' }}>Terms of Service</span>
            {' '}and{' '}
            <span style={{ color: 'var(--accent)' }}>Privacy Policy</span>
          </div>
        </div>

        {/* Features list */}
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { icon: '📖', text: 'Generate AI study notes from PYQs & syllabus' },
            { icon: '⬆️', text: 'Upload notes — credited to your GitHub account' },
            { icon: '🎓', text: 'Access exam tools and private study space' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><div className="loading-spinner" /></div>}>
      <SignInContent />
    </Suspense>
  );
}
