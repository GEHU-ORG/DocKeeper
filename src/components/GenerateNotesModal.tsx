'use client';

import { useState, useEffect } from 'react';
import { type FileItem } from '@/lib/github';

interface GenerateNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectPath: string; // e.g. UniExamPrep/GEU/B.Tech/CSE/Semester-4/Career Skills
  onSuccess: (chatId: string) => void;
}

export function GenerateNotesModal({ isOpen, onClose, subjectPath, onSuccess }: GenerateNotesModalProps) {
  const [pdfs, setPdfs] = useState<FileItem[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [noteType, setNoteType] = useState<'1-pager' | 'all-topics'>('1-pager');

  // Fetch PDFs from the subject's subfolders (PYQ, Notes, Syllabus)
  useEffect(() => {
    if (!isOpen || !subjectPath) return;

    const fetchSubjectPdfs = async () => {
      setIsLoading(true);
      setError('');
      try {
        const folders = ['PYQ', 'Notes', 'Syllabus'];
        const allPdfs: FileItem[] = [];

        for (const folder of folders) {
          const res = await fetch(`/api/files?path=${encodeURIComponent(subjectPath + '/' + folder)}`);
          if (res.ok) {
            const data = await res.json();
            const folderFiles = (data.items || []).filter((item: FileItem) => item.name.endsWith('.pdf'));
            folderFiles.forEach((f: any) => f.folder = folder);
            allPdfs.push(...folderFiles);
          }
        }
        setPdfs(allPdfs);
      } catch (err: any) {
        setError('Failed to fetch PDFs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjectPdfs();
    setSelectedUrls(new Set());
  }, [isOpen, subjectPath]);

  if (!isOpen) return null;

  const handleToggle = (url: string) => {
    setSelectedUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else {
        if (next.size >= 5) {
          alert('You can select a maximum of 5 files.');
          return prev;
        }
        next.add(url);
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selectedUrls.size === 0) {
      setError('Please select at least one file');
      return;
    }

    setIsGenerating(true);
    setError('');

    const selectedFiles = pdfs.filter(p => p.url && selectedUrls.has(p.url));
    const parts = subjectPath.split('/');
    const subjectName = parts[parts.length - 1];
    const repo = parts[1];

    try {
      const res = await fetch('/api/study/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          subjectPath,
          subjectName,
          selectedFiles,
          noteType,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate notes');
      
      onSuccess(data.chatId);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={!isGenerating ? onClose : undefined}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <h3 className="dialog-title">✨ Generate Study Notes</h3>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
          Select up to 5 PDFs from this subject to use as context. The AI will generate comprehensive exam-focused notes for you.
        </p>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div className="loading-spinner" />
          </div>
        ) : pdfs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            No PDFs found in PYQ, Notes, or Syllabus folders.
          </div>
        ) : (
          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '12px', border: '1px solid var(--border-color)' }}>
            {['Syllabus', 'PYQ', 'Notes'].map(folder => {
               const folderPdfs = pdfs.filter((p: any) => p.folder === folder);
               if (folderPdfs.length === 0) return null;
               return (
                 <div key={folder} style={{ marginBottom: '16px' }}>
                   <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                     {folder}
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                     {folderPdfs.map(pdf => (
                       <label key={pdf.url} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', cursor: 'pointer', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', transition: 'background 0.2s', border: '1px solid var(--border-color)' }}>
                         <input 
                           type="checkbox" 
                           checked={selectedUrls.has(pdf.url!)} 
                           onChange={() => handleToggle(pdf.url!)}
                           disabled={isGenerating}
                           style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                         />
                         <span style={{ fontSize: '0.85rem', wordBreak: 'break-all', fontWeight: 500 }}>{pdf.name}</span>
                       </label>
                     ))}
                   </div>
                 </div>
               );
            })}
          </div>
        )}

        {error && <p className="dialog-error">{error}</p>}

        {!isGenerating && pdfs.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Note Type:</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setNoteType('1-pager')}
                style={{
                  flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                  background: noteType === '1-pager' ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: noteType === '1-pager' ? '#fff' : 'var(--text-primary)',
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                📝 1-Pager (Important Topics)
              </button>
              <button
                type="button"
                onClick={() => setNoteType('all-topics')}
                style={{
                  flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                  background: noteType === 'all-topics' ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: noteType === 'all-topics' ? '#fff' : 'var(--text-primary)',
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                📚 Detailed (All Topics)
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
              {noteType === '1-pager' 
                ? 'Generates a condensed frequency table ranking important topics using PYQs and Syllabus prediction.'
                : 'Generates comprehensive notes covering all topics from the syllabus and provided PDFs.'}
            </p>
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="dialog-btn dialog-btn-cancel" onClick={onClose} disabled={isGenerating}>
            Cancel
          </button>
          <button 
            type="button" 
            className="dialog-btn dialog-btn-confirm" 
            onClick={handleGenerate} 
            disabled={isGenerating || pdfs.length === 0 || selectedUrls.size === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent)', borderColor: 'var(--accent)' }}
          >
            {isGenerating ? (
              <>
                <div className="loading-spinner loading-spinner-sm" />
                Generating... (May take 30s)
              </>
            ) : (
              <>✨ Generate Notes</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
