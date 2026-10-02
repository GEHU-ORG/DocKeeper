'use client';

import { ThemeToggle } from './ThemeToggle';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { JoinOrgPrompt } from './JoinOrgPrompt';

export function Header() {
  const sessionContext = useSession();
  const session = sessionContext?.data;
  const status = sessionContext?.status;
  const pathname = usePathname();
  
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);

  useEffect(() => {
    if (session?.user && (session.user as any).githubUsername) {
      fetch('/api/org/check')
        .then(res => res.json())
        .then(data => setIsMember(data.isMember))
        .catch(() => setIsMember(false));
    }
  }, [session]);

  const username = (session?.user as any)?.githubUsername;
  const isGuest = status === 'unauthenticated' || (session && !username);

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="header-title">
            {pathname === '/exam-portal' ? 'Exam Portal' : 'UniExamPrep'}
          </Link>
          <div className="header-actions">
            <ThemeToggle />
            
            {status !== 'loading' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '1rem' }}>
                {isGuest && (
                  <Link href="/signin" style={{ textDecoration: 'none' }}>
                    <button style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '20px', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
                      Sign In
                    </button>
                  </Link>
                )}

                {session && username && isMember === false && (
                  <button onClick={() => setShowJoinPrompt(true)} style={{ background: '#2ea043', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '20px', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
                    Join Org
                  </button>
                )}

                {!isGuest && session && (
                  <Link href="/profile" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                    {session.user?.image ? (
                      <img 
                        src={session.user.image} 
                        alt="Profile" 
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }}
                      />
                    ) : (
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', background: 'var(--text-primary)',
                        color: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: '1rem', border: '2px solid var(--border-color)'
                      }}>
                        {session.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {showJoinPrompt && username && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'var(--bg-primary)', overflow: 'auto' }}>
           <div style={{ position: 'absolute', top: '1rem', right: '2rem' }}>
             <button onClick={() => setShowJoinPrompt(false)} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
               <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
           </div>
           {/* Lazy load JoinOrgPrompt or import it at the top */}
           <JoinOrgPrompt username={username} />
        </div>
      )}
    </>
  );
}
