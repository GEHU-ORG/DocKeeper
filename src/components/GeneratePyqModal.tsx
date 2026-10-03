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

interface ExtractedQuestion {
  _id: string;
  questionText: string;
  marks?: string;
  isSolved: boolean;
}

export function GeneratePyqModal({ isOpen, onClose, subjectPath, repo, pdfFile, onSuccess }: GeneratePyqModalProps) {
  const [phase, setPhase] = useState<'idle' | 'extracting' | 'solving' | 'done'>('idle');
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [answerId, setAnswerId] = useState<string | null>(null);
  const [currentSolvingIndex, setCurrentSolvingIndex] = useState(-1);

  if (!isOpen || !pdfFile) return null;

  const handleStart = async () => {
    setPhase('extracting');
    setError('');

    try {
      // Phase 1: Extract
      const extractRes = await fetch('/api/study/generate-pyq-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract', repo, subjectPath, pdfFile })
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok) throw new Error(extractData.error || 'Failed to extract questions');

      setQuestions(extractData.questions);
      setAnswerId(extractData.answerId);
      setPhase('solving');

      // Phase 2: Solve sequentially
      let solvedCount = 0;
      for (let i = 0; i < extractData.questions.length; i++) {
        setCurrentSolvingIndex(i);
        try {
          const solveRes = await fetch('/api/study/generate-pyq-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'solve',
              answerId: extractData.answerId,
              questionId: extractData.questions[i]._id,
              repo,
              pdfFile
            })
          });
          if (solveRes.ok) {
            setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, isSolved: true } : q));
          }
        } catch (err) {
          console.error(`Failed to solve question ${i}`, err);
        }
        solvedCount++;
      }

      setPhase('done');
      onSuccess();
      setTimeout(onClose, 2000); // close after 2 seconds of showing Done
    } catch (err: any) {
      setError(err.message);
      setPhase('idle');
    }
  };

  return (
    <div className="dialog-overlay" onClick={phase === 'idle' ? onClose : undefined}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <h3 className="dialog-title">✨ Generate PYQ Answers</h3>
        
        {phase === 'idle' && (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              The AI will read <strong>{pdfFile.name}</strong>, extract all questions, and sequentially generate detailed solutions.
            </p>
            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.875rem' }}>
              <strong>Note:</strong> This process will happen live in chunks to prevent timeouts and ensure high-quality answers.
            </div>
          </>
        )}

        {phase === 'extracting' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0', gap: '16px' }}>
            <div className="loading-spinner" style={{ width: '40px', height: '40px' }} />
            <div style={{ color: 'var(--accent)', fontWeight: 600 }}>Reading PDF & Extracting Questions...</div>
          </div>
        )}

        {(phase === 'solving' || phase === 'done') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
            {questions.map((q, idx) => (
              <div key={q._id} style={{ 
                display: 'flex', gap: '12px', alignItems: 'flex-start',
                padding: '12px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: idx === currentSolvingIndex ? '1px solid var(--accent)' : '1px solid transparent'
              }}>
                <div style={{ marginTop: '2px' }}>
                  {q.isSolved ? (
                    <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✓</span>
                  ) : idx === currentSolvingIndex ? (
                    <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>○</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{q.questionText}</div>
                  {q.marks && <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '4px' }}>{q.marks}</div>}
                </div>
              </div>
            ))}
            
            {phase === 'done' && (
              <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 600, marginTop: '16px' }}>
                All questions solved successfully!
              </div>
            )}
          </div>
        )}

        {error && <p className="dialog-error">{error}</p>}

        {phase === 'idle' && (
          <div className="dialog-actions">
            <button type="button" className="dialog-btn dialog-btn-cancel" onClick={onClose}>Cancel</button>
            <button 
              type="button" 
              className="dialog-btn dialog-btn-confirm" 
              onClick={handleStart} 
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
