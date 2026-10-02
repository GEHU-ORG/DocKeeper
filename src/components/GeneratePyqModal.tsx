'use client';

import { useState, useEffect } from 'react';
import { type FileItem } from '@/lib/github';

interface GeneratePyqModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectPath: string; // e.g. UniExamPrep/GEU/B.Tech/CSE/Semester-4/Career Skills
  repo: string;
  pdfFile: FileItem | null;
  onSuccess: () => void;
}

const LOADING_MESSAGES = [
  'Extracting text from PDF...',
  'Analyzing document structure...',
  'Identifying exam questions...',
  'Formulating comprehensive answers...',
  'Structuring 10-mark solutions...',
  'Finalizing formatting...',
  'Almost there, saving to your folder...'
];

export function GeneratePyqModal({ isOpen, onClose, subjectPath, repo, pdfFile, onSuccess }: GeneratePyqModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 5000); // Change message every 5 seconds
    } else {
      setMessageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isOpen || !pdfFile) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const res = await fetch('/api/study/generate-pyq-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, subjectPath, pdfFile })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate PYQ answers');
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={!isGenerating ? onClose : undefined}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
        <h3 className="dialog-title">✨ Generate PYQ Answers</h3>
        
        {!isGenerating ? (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              The AI will read <strong>{pdfFile.name}</strong>, extract all questions, and write a detailed answer tailored to the question's marks.
            </p>
            
            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.875rem' }}>
              <strong>Note:</strong> This process uses complex reasoning and may take a minute depending on the length of the paper.
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0', gap: '16px' }}>
            <div className="loading-spinner" style={{ width: '40px', height: '40px' }} />
            <div style={{ color: 'var(--accent)', fontWeight: 600, textAlign: 'center', animation: 'pulse 2s infinite' }}>
              {LOADING_MESSAGES[messageIndex]}
            </div>
            <style>{`
              @keyframes pulse {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
              }
            `}</style>
          </div>
        )}

        {error && <p className="dialog-error">{error}</p>}

        {!isGenerating && (
          <div className="dialog-actions">
            <button type="button" className="dialog-btn dialog-btn-cancel" onClick={onClose} disabled={isGenerating}>
              Cancel
            </button>
            <button 
              type="button" 
              className="dialog-btn dialog-btn-confirm" 
              onClick={handleGenerate} 
              disabled={isGenerating}
              style={{ background: '#10b981', borderColor: '#10b981' }}
            >
              Start Generating
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
