'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (status === 'loading') {
    return <div className="loading-state">Loading profile...</div>;
  }

  // If not authenticated via Google, maybe it's a secret code session.
  // We can just allow them to logout from secret session here too.
  
  const handleLogout = async () => {
    if (session) {
      await signOut({ callbackUrl: '/' });
    } else {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    }
  };

  const handleDeleteAccount = async () => {
    if (!session?.user?.email) return;
    
    if (deleteEmailInput !== session.user.email) {
      alert("Email does not match!");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'DELETE',
      });
      if (res.ok) {
        await signOut({ callbackUrl: '/' });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete account');
        setIsDeleting(false);
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting account');
      setIsDeleting(false);
    }
  };

  return (
    <div className="profile-container" style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 'bold' }}>Profile Settings</h1>
      
      <div style={{ background: 'var(--bg-secondary)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        
        {/* Profile Picture Section */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Profile Picture</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {session?.user?.image ? (
              <img src={session.user.image} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }} />
            ) : (
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--text-primary)', color: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold' }}>
                {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'S'}
              </div>
            )}
            <div>
              <button disabled style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'not-allowed', fontSize: '14px' }}>
                Managed by GitHub
              </button>
            </div>
          </div>
        </div>

        {/* GitHub Username Section */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>GitHub Username</label>
          <input 
            type="text" 
            value={(session as any)?.user?.githubUsername || 'Unknown'} 
            disabled
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'not-allowed' }}
          />
        </div>

        {/* Name Section */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Name</label>
          <input 
            type="text" 
            value={session?.user?.name || 'Anonymous User'} 
            disabled
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'not-allowed' }}
          />
        </div>

        {/* Email Section */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
          <input 
            type="email" 
            value={session?.user?.email || 'Secret Session'} 
            disabled
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'not-allowed' }}
          />
          {session?.user?.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: '#10b981', fontSize: '14px', fontWeight: 500 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Verified
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
          <button 
            onClick={handleLogout}
            style={{ padding: '10px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </div>

    </div>
  );
}
