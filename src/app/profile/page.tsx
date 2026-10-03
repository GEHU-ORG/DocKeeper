'use client';

import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isLinking, setIsLinking] = useState<'github' | 'google' | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<{ github: boolean; google: boolean }>({ github: false, google: false });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gemini-1.5-flash');
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);

  const githubUsername = (session?.user as any)?.githubUsername;
  const provider = (session?.user as any)?.provider;

  useEffect(() => {
    if (session?.user?.email) {
      fetch('/api/account/linked-accounts')
        .then(r => r.json())
        .then(data => setLinkedAccounts(data))
        .catch(() => {});
        
      fetch('/api/account/api-key')
        .then(r => r.json())
        .then(data => {
          setApiKey(data.apiKey || '');
          setModelName(data.modelName || 'gemini-1.5-flash');
        })
        .catch(() => {});
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!session) {
    router.push('/signin');
    return null;
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const handleLinkGitHub = async () => {
    setIsLinking('github');
    // signIn with GitHub while session is active links the accounts
    await signIn('github', { callbackUrl: '/profile' });
  };

  const handleLinkGoogle = async () => {
    setIsLinking('google');
    await signIn('google', { callbackUrl: '/profile' });
  };

  const handleDeleteAccount = async () => {
    if (!session?.user?.email) return;
    if (deleteEmailInput !== session.user.email) {
      alert('Email does not match!');
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      if (res.ok) {
        await signOut({ callbackUrl: '/' });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete account');
        setIsDeleting(false);
      }
    } catch {
      alert('Error deleting account');
      setIsDeleting(false);
    }
  };

  const handleSaveApiKey = async () => {
    setIsSavingApiKey(true);
    try {
      const res = await fetch('/api/account/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), modelName }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.modelName && data.modelName !== modelName) {
           setModelName(data.modelName);
           alert(`API Key saved! Note: The requested model failed, but we verified it works with ${data.modelName} instead and auto-corrected it.`);
        } else {
           alert('API Key saved successfully!');
        }
      } else {
        alert(data.error || 'Failed to save API Key');
      }
    } catch {
      alert('Error saving API Key');
    }
    setIsSavingApiKey(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px', borderRadius: '8px',
    border: '1px solid var(--border-color)', background: 'var(--bg-primary)',
    color: 'var(--text-primary)', cursor: 'not-allowed', boxSizing: 'border-box',
    fontSize: '0.95rem',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600,
    color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  return (
    <div style={{ maxWidth: '560px', margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 800 }}>Profile Settings</h1>

      <div className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Avatar + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {session.user?.image ? (
            <img src={session.user.image} alt="Profile"
              style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border-color)', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', background: 'var(--accent)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: 800, flexShrink: 0,
            }}>
              {session.user?.name?.charAt(0).toUpperCase() ?? session.user?.email?.charAt(0).toUpperCase() ?? 'U'}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{session.user?.name ?? 'Anonymous'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{session.user?.email}</div>
            {session.user?.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Verified
              </div>
            )}
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border-color)' }} />

        {/* Linked Accounts */}
        <div>
          <div style={{ ...labelStyle, marginBottom: '16px' }}>Linked Accounts</div>

          {/* GitHub */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)', marginBottom: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>GitHub</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {githubUsername ? `@${githubUsername} · Contribution credits active` : 'Not linked'}
                </div>
              </div>
            </div>
            {githubUsername ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Connected
              </div>
            ) : (
              <button
                id="link-github-btn"
                onClick={handleLinkGitHub}
                disabled={isLinking === 'github'}
                style={{
                  padding: '7px 16px', borderRadius: '8px', border: '1px solid #6e40c9',
                  background: 'transparent', color: '#6e40c9', fontWeight: 600, cursor: 'pointer',
                  fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {isLinking === 'github' ? '...' : '+ Connect'}
              </button>
            )}
          </div>

          {/* Google */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Google</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {linkedAccounts.google ? session.user?.email : 'Not linked'}
                </div>
              </div>
            </div>
            {linkedAccounts.google ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Connected
              </div>
            ) : (
              <button
                id="link-google-btn"
                onClick={handleLinkGoogle}
                disabled={isLinking === 'google'}
                style={{
                  padding: '7px 16px', borderRadius: '8px', border: '1px solid #4285f4',
                  background: 'transparent', color: '#4285f4', fontWeight: 600, cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                {isLinking === 'google' ? '...' : '+ Connect'}
              </button>
            )}
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border-color)' }} />

        {/* AI Settings */}
        <div>
          <div style={{ ...labelStyle, marginBottom: '16px' }}>AI Settings</div>
          <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '8px' }}>Custom Gemini API Key</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
              Add your own Google Gemini API key to make your generated study notes and PYQ answers private.
              If left blank, the global shared key is used and your generated notes will be public for everyone to see.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{ ...inputStyle, cursor: 'text' }}
              />
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', width: '200px' }}
              >
                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              </select>
              <button
                onClick={handleSaveApiKey}
                disabled={isSavingApiKey}
                style={{
                  padding: '0 20px', borderRadius: '8px', background: 'var(--accent)', color: '#fff',
                  border: 'none', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                }}
              >
                {isSavingApiKey ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* GitHub contribution info */}
        {githubUsername && (
          <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px', fontSize: '0.9rem' }}>✨ Contribution Credits Active</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Any files you upload are permanently credited to <strong>@{githubUsername}</strong> in the Git history.
            </div>
          </div>
        )}

        {!githubUsername && (
          <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '4px', fontSize: '0.9rem' }}>⚡ Link GitHub for Contribution Credits</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Connect your GitHub account to get your name in the Git commit history for every file you upload.
            </div>
          </div>
        )}

        <div style={{ height: '1px', background: 'var(--border-color)' }} />

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setShowDeleteConfirm(v => !v)}
            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
          >
            {showDeleteConfirm ? 'Cancel' : 'Delete Account'}
          </button>
          <button
            id="signout-btn"
            onClick={handleLogout}
            style={{ padding: '10px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>

        {showDeleteConfirm && (
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <p style={{ margin: '0 0 12px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Type your email <strong>{session.user?.email}</strong> to confirm deletion:
            </p>
            <input
              type="email"
              placeholder="your@email.com"
              value={deleteEmailInput}
              onChange={e => setDeleteEmailInput(e.target.value)}
              style={{ ...inputStyle, cursor: 'text', marginBottom: '12px' }}
            />
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              style={{ width: '100%', padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
