'use client';

import { useState, useEffect } from 'react';
import { getSubjectDetails } from '@/app/exam-portal/actions';
import { ModelSelector } from './ModelSelector';

export interface FileItem {
  name: string;
  type: 'file' | 'dir';
  url?: string;
  path: string;
  sha: string;
  size?: number;
}

function TreeFolder({ path, name, onToggleFile, selectedFiles }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const toggleOpen = async () => {
    if (!isOpen && !loaded) {
      setLoading(true);
      try {
        const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
        const data = await res.json();
        setItems(data.files || []);
        setLoaded(true);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    setIsOpen(!isOpen);
  };

  return (
    <div style={{ paddingLeft: '8px' }}>
      <div 
        onClick={toggleOpen} 
        style={{ 
          display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '6px 8px',
          borderRadius: '4px',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <svg 
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.1s', marginRight: '4px', opacity: 0.7 }}
        >
          <path d="M9 18l6-6-6-6"/>
        </svg>
        <svg width="18" height="18" viewBox="0 0 16 16" fill="#FFC107" style={{ marginRight: '8px' }}><path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3z"/></svg>
        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{name}</span>
      </div>
      {isOpen && (
        <div style={{ marginLeft: '14px', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          {loading && <div style={{ padding: '4px 24px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loading...</div>}
          {!loading && items.length === 0 && <div style={{ padding: '4px 24px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Empty folder</div>}
          {items.map(item => item.type === 'dir' ? (
            <TreeFolder key={item.sha} path={item.path} name={item.name} onToggleFile={onToggleFile} selectedFiles={selectedFiles} />
          ) : (
            <div 
              key={item.sha} 
              style={{ display: 'flex', alignItems: 'center', padding: '6px 8px 6px 20px', cursor: 'pointer', borderRadius: '4px' }} 
              onClick={() => onToggleFile(item)}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <input type="checkbox" checked={!!selectedFiles.find((f: any) => f.sha === item.sha)} readOnly style={{ marginRight: '8px' }} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', opacity: 0.6 }}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
              <span style={{ fontSize: '0.85rem', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SubjectStudySpace({ 
  subjectId, 
  subjectName, 
  subjectPath 
}: { 
  subjectId: string, 
  subjectName?: string, 
  subjectPath: string 
}) {
  const [subject, setSubject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [modelConfig, setModelConfig] = useState<{ id: string, apiKey: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  // Mini File Browser states
  const [items, setItems] = useState<FileItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);

  const fetchSubject = async () => {
    setLoading(true);
    const data = await getSubjectDetails(subjectId);
    if (data) setSubject(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubject();
  }, [subjectId]);

  const universityRoot = subjectPath.split('/').slice(0, 2).join('/') || subjectPath;

  useEffect(() => {
    setFilesLoading(true);
    fetch(`/api/files?path=${encodeURIComponent(universityRoot)}`)
      .then(res => res.json())
      .then(data => {
        setItems(data.files || []);
      })
      .catch(console.error)
      .finally(() => setFilesLoading(false));
  }, [universityRoot]);

  const toggleFileSelect = (file: FileItem) => {
    setSelectedFiles(prev => {
      const exists = prev.find(f => f.sha === file.sha);
      if (exists) return prev.filter(f => f.sha !== file.sha);
      return [...prev, file];
    });
  };

  const generateAI = async (type: '1-pager' | 'detailed') => {
    if (!modelConfig?.apiKey) {
      alert('Please select a model and add your API key first.');
      return;
    }

    setAiLoading(true);
    setAiResponse('');

    const baseContext = `
Subject: ${subject?.name || 'Unknown Subject'}
    `;

    const fileContext = selectedFiles.length > 0 
      ? `\nAdditionally, the user has selected the following files as context for this generation:\n${selectedFiles.map(f => `- ${f.name}`).join('\n')}\n(Assume the contents of these files heavily dictate the final output).`
      : '';

    const prompt1Pager = `You are an expert academic tutor. Based on the syllabus and PYQ analysis provided below, generate a high-yield, densely packed "1-Pager" study sheet. 
Focus only on the most critical concepts, heavily tested topics, and quick formulas/definitions. Make it highly scannable with bullet points and bold text.\n\n${baseContext}${fileContext}`;
    
    const promptDetailed = `You are an expert academic tutor. Based on the syllabus and PYQ analysis provided below, generate a highly detailed explanation and comprehensive study guide.
Break down each unit, explain the core concepts required for the exam, and provide step-by-step guidance on how to tackle the expected questions from the PYQs.\n\n${baseContext}${fileContext}`;

    const userPrompt = type === '1-pager' ? prompt1Pager : promptDetailed;

    try {
      if (modelConfig.id.startsWith('gemini')) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.id}:generateContent?key=${modelConfig.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: userPrompt }] }] })
        });
        const data = await res.json();
        if (data.error) setAiResponse(`Error: ${data.error.message}`);
        else setAiResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.');
      } else {
        setAiResponse(`Integration for ${modelConfig.id} is coming soon! Try Gemini models for now.`);
      }
    } catch (error: any) {
      setAiResponse(`Request failed: ${error.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '24px' }}>Loading Subject...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' }}>
        
        {/* Left Column: VS Code Style File Browser */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', maxHeight: '600px' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Explorer
          </h4>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filesLoading ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.9rem' }}>Loading...</div>
            ) : items.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Empty subject folder</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '8px' }}>
                {items.map(item => item.type === 'dir' ? (
                  <TreeFolder key={item.sha} path={item.path} name={item.name} onToggleFile={toggleFileSelect} selectedFiles={selectedFiles} />
                ) : (
                  <div 
                    key={item.sha} 
                    style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px' }} 
                    onClick={() => toggleFileSelect(item)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <input type="checkbox" checked={!!selectedFiles.find((f: any) => f.sha === item.sha)} readOnly style={{ marginRight: '8px' }} />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', opacity: 0.6 }}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                    <span style={{ fontSize: '0.85rem', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Generation */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '600px' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '1.2rem' }}>AI Study Engine</h4>
          
          <div style={{ marginBottom: '16px' }}>
            <ModelSelector onModelSelect={(id, apiKey) => setModelConfig({ id, apiKey })} />
          </div>

          {selectedFiles.length > 0 && (
            <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--accent)', marginBottom: '16px' }}>
              <strong>📎 {selectedFiles.length} files selected:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {selectedFiles.map(f => (
                  <span key={f.sha} style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/></svg>
                    {f.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button 
              onClick={() => generateAI('1-pager')}
              disabled={aiLoading}
              className="action-btn"
              style={{ flex: 1, padding: '12px', background: 'var(--accent)', color: 'white', fontWeight: 600 }}
            >
              ✨ Generate 1-Pager
            </button>
            <button 
              onClick={() => generateAI('detailed')}
              disabled={aiLoading}
              className="action-btn"
              style={{ flex: 1, padding: '12px', background: 'var(--text-primary)', color: 'var(--bg-primary)', fontWeight: 600 }}
            >
              📚 Detailed Explanation
            </button>
          </div>

          {aiLoading && <div style={{ color: 'var(--accent)', padding: '16px', textAlign: 'center' }}>AI is analyzing your selected files...</div>}
          
          {aiResponse && !aiLoading && (
            <div style={{
              padding: '16px',
              background: 'var(--bg-tertiary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              flex: 1,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              fontSize: '0.95rem',
              lineHeight: 1.6
            }}>
              {aiResponse}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
