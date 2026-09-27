'use client';

import { useState } from 'react';

export function JoinOrgPrompt({ username }: { username: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/org/join', { method: 'POST' });
      if (res.ok) {
        setSuccess(true);
      } else {
        alert('Failed to send invitation. Please try again.');
      }
    } catch (e) {
      alert('An error occurred.');
    }
    setLoading(false);
  };

  return (
    <div className="landing-container" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 800 }}>Join GEHU-ORG</h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '3rem', textAlign: 'center', maxWidth: '600px' }}>
        Hi <strong>@{username}</strong>, you need to be a member of the <strong>GEHU-ORG</strong> organization to collaborate and manage files here.
      </p>

      {success ? (
        <div style={{ padding: '2.5rem', background: '#d4edda', color: '#155724', borderRadius: '12px', border: '1px solid #c3e6cb', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.8rem', fontWeight: 'bold' }}>Invitation Sent! 🎉</h2>
          <p style={{ marginBottom: '2rem', fontSize: '1.1rem' }}>We've sent you an invitation to join the organization on GitHub.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <a 
              href="https://github.com/orgs/GEHU-ORG/invitation" 
              target="_blank" 
              rel="noreferrer"
              style={{
                display: 'inline-block', padding: '1rem 2rem', background: '#155724', color: '#fff', 
                textDecoration: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '1.1rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            >
              Go to GitHub to Accept Invitation
            </a>
            
            <button 
              onClick={() => window.location.reload()}
              style={{ padding: '0.8rem', background: 'transparent', color: '#155724', border: '1px solid #155724', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              I have accepted it, reload page
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={handleJoin}
          disabled={loading}
          style={{
            padding: '1rem 2rem', background: '#2ea043', color: '#fff', border: 'none', borderRadius: '6px',
            fontSize: '1.2rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Sending Invitation...' : 'Send Join Invitation'}
        </button>
      )}
    </div>
  );
}
