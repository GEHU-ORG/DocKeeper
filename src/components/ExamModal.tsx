'use client';

import { useState, useEffect } from 'react';
import { SubjectStudySpace } from './SubjectStudySpace';

interface ExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  path: string;
}

export function ExamModal({ isOpen, onClose, path }: ExamModalProps) {
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && path) {
      const parts = path.split('/');
      const subjName = parts.length >= 6 ? parts[5] : parts[parts.length - 1];
      setSubjectName(subjName);
      
      setIsLoading(true);
      setError(null);
      fetch('/api/subject/resolve-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) setError(data.error);
          else setSubjectId(data.subject.id);
        })
        .catch(err => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, path]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="card" style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', width: '1200px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2em' }}>🎓</span> Exam Portal - {subjectName}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--text-secondary)' }}>
            &times;
          </button>
        </div>
        
        {isLoading && <p>Loading exam portal...</p>}
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        
        {subjectId && !isLoading && !error && (
          <SubjectStudySpace subjectId={subjectId} subjectName={subjectName} subjectPath={path} />
        )}
      </div>
    </div>
  );
}
