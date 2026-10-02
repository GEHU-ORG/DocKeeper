'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChatRenderer } from '@/components/ChatRenderer';

interface SelectedFile {
  name: string;
  sha: string;
  repo: string;
  path: string;
}

interface StudyItem {
  name: string;
  path: string;
  sha: string;
}

export default function StudyPage({ params }: { params: { path: string[] } }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Parse path: [uni, course, dept, semester, subject] minimum
  const pathParts = params.path || [];
  const uni = pathParts[0];
  const repo = uni; // repo name = uni slug
  const subjectName = pathParts[pathParts.length - 1];
  const subjectPath = pathParts.slice(1).join('/'); // e.g. B.Pharm/General/Semester-1/Pharmaceutics I

  const [availableFiles, setAvailableFiles] = useState<{ PYQ: SelectedFile[]; Notes: SelectedFile[]; Syllabus: SelectedFile[] }>({ PYQ: [], Notes: [], Syllabus: [] });
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [studyItems, setStudyItems] = useState<{ onePagers: StudyItem[]; studyNotes: StudyItem[] }>({ onePagers: [], studyNotes: [] });
  const [viewingChat, setViewingChat] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateType, setGenerateType] = useState<'notes' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFiles = useCallback(async () => {
    if (!uni || !subjectPath) return;
    setIsLoading(true);
    try {
      // Fetch files from all 3 category folders
      const categories = ['PYQ', 'Notes', 'Syllabus'];
      const results: Record<string, SelectedFile[]> = { PYQ: [], Notes: [], Syllabus: [] };

      await Promise.all(categories.map(async (cat) => {
        try {
          const res = await fetch(`/api/files?path=${uni}/${subjectPath}/${cat}`);
          const data = await res.json();
          if (data.items) {
            results[cat] = data.items
              .filter((i: any) => i.type === 'file' && i.name.endsWith('.pdf'))
              .map((i: any) => ({ name: i.name, sha: i.sha, repo: uni, path: `${subjectPath}/${cat}/${i.name}` }));
          }
        } catch { /* empty category */ }
      }));

      setAvailableFiles(results as any);

      // Auto-select all PYQ + Notes files
      const autoSelect = new Set<string>();
      [...(results.PYQ || []), ...(results.Notes || [])].forEach(f => autoSelect.add(f.sha));
      setSelectedFiles(autoSelect);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [uni, subjectPath]);

  const fetchStudyItems = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`/api/study/list?repo=${repo}&subjectPath=${encodeURIComponent(subjectPath)}`);
      const data = await res.json();
      setStudyItems(data);
    } catch { /* ignore */ }
  }, [session, repo, subjectPath]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
    if (status === 'authenticated') {
      fetchFiles();
      fetchStudyItems();
    }
  }, [status, fetchFiles, fetchStudyItems, router]);

  const toggleFile = (sha: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(sha)) next.delete(sha);
      else next.add(sha);
      return next;
    });
  };

  const allFiles = [...availableFiles.PYQ, ...availableFiles.Notes, ...availableFiles.Syllabus];
  const selectedFileObjects = allFiles.filter(f => selectedFiles.has(f.sha));

  const handleGenerateNotes = async () => {
    if (!selectedFileObjects.length) { setError('Select at least one file'); return; }
    setIsGenerating(true);
    setGenerateType('notes');
    setError(null);
    try {
      const res = await fetch('/api/study/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, subjectPath, subjectName, selectedFiles: selectedFileObjects }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setViewingChat(data.content);
      fetchStudyItems();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsGenerating(false);
      setGenerateType(null);
    }
  };

  const handleViewChat = async (item: StudyItem) => {
    try {
      const res = await fetch(`/api/study/read?repo=${repo}&path=${encodeURIComponent(item.path)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setViewingChat(data.content);
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading study space...</p>
      </div>
    );
  }

  if (viewingChat) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
        <button
          onClick={() => setViewingChat(null)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '16px', fontSize: '0.9rem' }}
        >
          ← Back to Study Space
        </button>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <ChatRenderer data={viewingChat} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '12px', fontSize: '0.9rem' }}
        >
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '2rem' }}>📖</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{subjectName}</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              AI Study Space · Private to you
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#ef4444', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left: File Selector */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📂 Select Source Files
          </h3>

          {(['PYQ', 'Notes', 'Syllabus'] as const).map(cat => (
            availableFiles[cat].length > 0 && (
              <div key={cat} style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {cat === 'PYQ' ? '📋' : cat === 'Notes' ? '📝' : '📚'} {cat}
                </div>
                {availableFiles[cat].map(file => (
                  <label
                    key={file.sha}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '6px', cursor: 'pointer', background: selectedFiles.has(file.sha) ? 'rgba(99,102,241,0.08)' : 'transparent', marginBottom: '4px' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.sha)}
                      onChange={() => toggleFile(file.sha)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </span>
                  </label>
                ))}
              </div>
            )
          ))}

          {allFiles.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
              No PDF files found in this subject
            </div>
          )}

          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              {selectedFiles.size} of {allFiles.length} files selected
            </p>
            <button
              onClick={handleGenerateNotes}
              disabled={isGenerating || selectedFiles.size === 0}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                background: isGenerating ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', fontWeight: 700, cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {isGenerating && generateType === 'notes' ? (
                <><div className="loading-spinner loading-spinner-sm" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Generating...</>
              ) : (
                <>✨ Generate Study Notes</>
              )}
            </button>
          </div>
        </div>

        {/* Right: Previously Generated */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📚 My Study Notes
          </h3>

          {studyItems.studyNotes.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🌟</div>
              <p style={{ margin: 0, fontWeight: 600 }}>No study notes yet</p>
              <p style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>Select files and click Generate to create your first study notes</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {studyItems.studyNotes.map((item) => {
                const date = item.name.replace('.chat', '').replace(/T/, ' ').replace(/-(\d{2})-(\d{2})$/, ':$1:$2');
                return (
                  <div
                    key={item.path}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
                  >
                    <span style={{ fontSize: '1.4rem' }}>💬</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Study Notes</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>{date.slice(0, 16)}</div>
                    </div>
                    <button
                      onClick={() => handleViewChat(item)}
                      style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      View
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
