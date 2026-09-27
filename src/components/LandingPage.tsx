'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export function LandingPage() {
  const [secretCode, setSecretCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretCode.trim()) return;

    setIsLoading(true);
    try {
      await fetch('/api/auth/secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretCode: secretCode.trim() }),
      });
      // Hard refresh to trigger server component reload
      window.location.reload();
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div className="landing-container" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 800 }}>DataKeeper</h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '3rem', textAlign: 'center', maxWidth: '600px' }}>
        Your personal and ephemeral virtual file system. Sign in to access your permanent drive, or enter a secret code to join a temporary 24-hour folder.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '400px' }}>
        <div style={{
          background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)'
        }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', textAlign: 'center' }}>Sign in to continue</h2>
          <button 
            onClick={() => signIn('github')}
            style={{
              width: '100%', padding: '0.8rem', background: '#24292e', color: '#fff', border: 'none', borderRadius: '6px',
              fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <svg height="24" width="24" viewBox="0 0 16 16" fill="white">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            Sign in with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
