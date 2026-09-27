'use client';

import { useState } from 'react';

export interface AIMove {
  old_path: string;
  new_path: string;
}

interface AIOrganizeDialogProps {
  isOpen: boolean;
  isLoading: boolean;
  moves: AIMove[];
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
  currentPath: string;
}

export function AIOrganizeDialog({
  isOpen,
  isLoading,
  moves,
  error,
  onClose,
  onConfirm,
  currentPath,
}: AIOrganizeDialogProps) {
  const [isExecuting, setIsExecuting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsExecuting(true);
    await onConfirm();
    setIsExecuting(false);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '100%', background: 'var(--bg-primary)' }}>
        <div className="dialog-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="dialog-title" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px' }}>✨</span>
            AI Organization Plan
          </h2>
          <button className="dialog-close" onClick={onClose} disabled={isExecuting} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="dialog-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 16px', width: '32px', height: '32px' }} />
              <p>AI is analyzing your files...</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                Looking at {currentPath || 'root'} and all child folders.
              </p>
            </div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--red)' }}>
              <p style={{ fontWeight: 600 }}>Error Generating Plan</p>
              <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>{error}</p>
            </div>
          ) : moves.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>✨ The AI thinks your files are already perfectly organized!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                The AI proposes the following organization plan for your files:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {moves.map((move, i) => {
                  const oldParts = move.old_path.split('/');
                  const newParts = move.new_path.split('/');
                  const fileName = oldParts[oldParts.length - 1];
                  
                  const getRelativeDir = (fullPath: string) => {
                    let dir = fullPath.split('/').slice(0, -1).join('/');
                    if (currentPath && dir.startsWith(currentPath)) {
                      dir = dir.substring(currentPath.length);
                      if (dir.startsWith('/')) dir = dir.substring(1);
                      return dir || 'Current Folder';
                    }
                    return dir;
                  };

                  const oldDir = getRelativeDir(move.old_path);
                  const newDir = getRelativeDir(move.new_path);

                  return (
                    <div key={i} style={{ 
                      background: 'var(--bg-secondary)', 
                      padding: '16px', 
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                          </svg>
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', wordBreak: 'break-word' }}>
                          {fileName}
                        </span>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        fontSize: '0.85rem', 
                        paddingLeft: '6px',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)' }}>
                          <span style={{ textDecoration: 'line-through', opacity: 0.8 }}>{oldDir}</span>
                        </div>
                        
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontWeight: 500, background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                          </svg>
                          <span>{newDir}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="dialog-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', gap: '16px' }}>
          <button
            className="dialog-btn dialog-btn-secondary"
            onClick={onClose}
            disabled={isExecuting}
            style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer' }}
          >
            {moves.length === 0 && !isLoading ? 'Close' : 'Cancel'}
          </button>
          {!isLoading && moves.length > 0 && (
            <button
              className="dialog-btn dialog-btn-primary"
              onClick={handleConfirm}
              disabled={isExecuting}
              style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--accent)', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              {isExecuting && <div className="loading-spinner loading-spinner-sm" style={{ borderTopColor: 'white' }} />}
              Confirm & Organize
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
