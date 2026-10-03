'use client';

import { useState, useEffect, useRef } from 'react';
import { type FileItem } from '@/lib/github';

interface GeneratePyqModalProps {
  isOpen: boolean;
  isHidden?: boolean;
  onClose: () => void;
  onRunInBackground?: (answerId: string) => void;
  subjectPath: string;
  repo: string;
  pdfFile: FileItem | null;
  onSuccess: () => void;
}

interface ExtractedQuestion {
  _id: string;
  questionText: string;
  marks?: string;
  isSolved: boolean;
  hasError?: boolean;
}

export function GeneratePyqModal({ isOpen, isHidden, onClose, onRunInBackground, subjectPath, repo, pdfFile, onSuccess }: GeneratePyqModalProps) {
  const [phase, setPhase] = useState<'idle' | 'extracting' | 'solving' | 'done'>('idle');
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [answerId, setAnswerId] = useState<string | null>(null);
  const [currentSolvingIndex, setCurrentSolvingIndex] = useState(-1);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isCancelled = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      isCancelled.current = true;
      setPhase('idle');
      setQuestions([]);
      setCurrentSolvingIndex(-1);
    } else {
      isCancelled.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (listRef.current && currentSolvingIndex >= 0) {
      const activeElement = listRef.current.children[currentSolvingIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentSolvingIndex]);

  if (!isOpen || !pdfFile) return null;
  if (isHidden) return null;

  const solveSingleQuestion = async (qIndex: number, aId: string, qId: string) => {
    if (isCancelled.current) return;
    setCurrentSolvingIndex(qIndex);
    
    // Reset error state for this question before trying
    setQuestions(prev => prev.map((q, idx) => idx === qIndex ? { ...q, hasError: false } : q));

    try {
      const solveRes = await fetch('/api/study/generate-pyq-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'solve', answerId: aId, questionId: qId, repo, pdfFile }),
        signal: abortControllerRef.current?.signal
      });
      
      if (!solveRes.ok) throw new Error('Failed to solve');
      setQuestions(prev => prev.map((q, idx) => idx === qIndex ? { ...q, isSolved: true, hasError: false } : q));
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error(`Failed to solve question ${qIndex}`, err);
      setQuestions(prev => prev.map((q, idx) => idx === qIndex ? { ...q, hasError: true } : q));
    }
  };

  const handleStart = async () => {
    setPhase('extracting');
    setError('');
    isCancelled.current = false;
    abortControllerRef.current = new AbortController();

    try {
      const extractRes = await fetch('/api/study/generate-pyq-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract', repo, subjectPath, pdfFile }),
        signal: abortControllerRef.current.signal
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok) throw new Error(extractData.error || 'Failed to extract questions');

      setQuestions(extractData.questions);
      setAnswerId(extractData.answerId);
      setPhase('solving');

      for (let i = 0; i < extractData.questions.length; i++) {
        if (isCancelled.current) break;
        await solveSingleQuestion(i, extractData.answerId, extractData.questions[i]._id);
      }

      if (!isCancelled.current) {
        setPhase('done');
        onSuccess();
        // Only auto-close if the modal is visible (not running in background)
        if (!isHidden) {
          setTimeout(onClose, 2500);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      setPhase('idle');
    }
  };

  const handleCancel = () => {
    isCancelled.current = true;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    onClose();
  };

  const solvedCount = questions.filter(q => q.isSolved).length;
  const progressPercent = questions.length > 0 ? (solvedCount / questions.length) * 100 : 0;

  return (
    <div className="dialog-overlay" onClick={handleCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="dialog-title" style={{ margin: 0 }}>✨ Generate Solutions</h3>
          {phase !== 'idle' && phase !== 'done' && (
            <button onClick={handleCancel} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
              Cancel
            </button>
          )}
        </div>
        
        {phase === 'idle' && (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '20px' }}>
              The AI will read <strong>{pdfFile.name}</strong>, intelligently extract all the questions, and sequentially stream detailed, marks-appropriate solutions into the database.
            </p>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '24px', fontSize: '0.875rem', borderLeft: '4px solid var(--accent)' }}>
              <strong>Production Ready:</strong> This process uses an asynchronous pipeline to prevent timeouts, ensures high-quality generation, and safely saves your progress locally if interrupted.
            </div>
          </>
        )}

        {phase === 'extracting' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '20px' }}>
            <div className="loading-spinner" style={{ width: '48px', height: '48px', borderWidth: '3px' }} />
            <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1.1rem' }}>Parsing Document & Extracting Layout...</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>This usually takes about 3-5 seconds.</p>
          </div>
        )}

        {(phase === 'solving' || phase === 'done') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Progress Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                <span style={{ color: 'var(--text-primary)' }}>Solving Questions...</span>
                <span style={{ color: 'var(--accent)' }}>{solvedCount} / {questions.length}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPercent}%`, background: '#10b981', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '6px', scrollBehavior: 'smooth' }}>
              {questions.map((q, idx) => (
                <div key={q._id} style={{ 
                  display: 'flex', gap: '16px', alignItems: 'flex-start',
                  padding: '16px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: idx === currentSolvingIndex ? '1px solid var(--accent)' : '1px solid transparent',
                  transition: 'border-color 0.2s ease, transform 0.2s ease',
                  transform: idx === currentSolvingIndex ? 'scale(1.01)' : 'scale(1)'
                }}>
                  <div style={{ marginTop: '2px' }}>
                    {q.isSolved ? (
                      <span style={{ color: '#10b981', fontSize: '1.3rem' }}>✅</span>
                    ) : q.hasError ? (
                      <span style={{ color: '#ef4444', fontSize: '1.3rem' }}>❌</span>
                    ) : idx === currentSolvingIndex ? (
                      <div className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderColor: 'var(--accent) transparent var(--accent) transparent' }} />
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '1.3rem', opacity: 0.5 }}>⏳</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>{q.questionText}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      {q.marks && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-transparent)', padding: '2px 8px', borderRadius: '12px' }}>{q.marks}</span>}
                      
                      {q.hasError && answerId && (
                        <button 
                          onClick={() => solveSingleQuestion(idx, answerId, q._id)}
                          style={{ fontSize: '0.75rem', color: '#ef4444', background: 'transparent', border: '1px solid #ef4444', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {phase === 'done' && (
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: 'var(--radius-md)', fontWeight: 600, marginTop: '8px' }}>
                All questions successfully solved and stored in the database!
              </div>
            )}

            {phase === 'solving' && onRunInBackground && answerId && (
              <button 
                onClick={() => onRunInBackground(answerId)} 
                style={{ width: '100%', padding: '12px', marginTop: '16px', background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                <span style={{ fontSize: '1.2rem' }}>💬</span> Read Live Chat (Solve in Background)
              </button>
            )}
          </div>
        )}

        {error && <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>{error}</div>}

        {phase === 'idle' && (
          <div className="dialog-actions" style={{ marginTop: '24px' }}>
            <button type="button" className="dialog-btn dialog-btn-cancel" onClick={handleCancel}>Cancel</button>
            <button 
              type="button" 
              className="dialog-btn dialog-btn-confirm" 
              onClick={handleStart} 
              style={{ background: '#10b981', borderColor: '#10b981', padding: '10px 24px', fontWeight: 600 }}
            >
              Start Pipeline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
