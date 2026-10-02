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
  const [viewPath, setViewPath] = useState(subjectPath);
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

  useEffect(() => {
    if (!viewPath) return;
    setFilesLoading(true);
    fetch(`/api/files?path=${encodeURIComponent(viewPath)}`)
      .then(res => res.json())
      .then(data => {
        setItems(data.files || []);
      })
      .catch(console.error)
      .finally(() => setFilesLoading(false));
  }, [viewPath]);

  const toggleFileSelect = (file: FileItem) => {
    setSelectedFiles(prev => {
      const exists = prev.find(f => f.sha === file.sha);
      if (exists) return prev.filter(f => f.sha !== file.sha);
      return [...prev, file];
    });
  };

  const handleBackPath = () => {
    if (viewPath === subjectPath) return;
    const parts = viewPath.split('/');
    parts.pop();
    setViewPath(parts.join('/'));
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
        
        {/* Left Column: Mini File Browser */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', maxHeight: '600px' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '12px' }}>Select Study Data</h4>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '6px' }}>
            <button 
              onClick={handleBackPath}
              disabled={viewPath === subjectPath}
              style={{ background: 'none', border: 'none', cursor: viewPath === subjectPath ? 'not-allowed' : 'pointer', color: 'var(--text-primary)', opacity: viewPath === subjectPath ? 0.5 : 1 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {viewPath.replace(subjectPath, 'Home') || 'Home'}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-tertiary)' }}>
            {filesLoading ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.9rem' }}>Loading...</div>
            ) : items.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Empty folder</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {items.map(item => (
                  <div 
                    key={item.sha}
                    onClick={() => item.type === 'dir' ? setViewPath(item.path) : toggleFileSelect(item)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', 
                      borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                      background: item.type === 'file' && selectedFiles.find(f => f.sha === item.sha) ? 'var(--bg-secondary)' : 'transparent'
                    }}
                  >
                    {item.type === 'dir' ? (
                      <svg width="20" height="20" viewBox="0 0 16 16" fill="#FFC107"><path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3z"/></svg>
                    ) : (
                      <input type="checkbox" checked={!!selectedFiles.find(f => f.sha === item.sha)} readOnly />
                    )}
                    <span style={{ fontSize: '0.9rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    {item.type === 'dir' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Generation */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '1.2rem' }}>AI Study Engine</h4>
          
          <div style={{ marginBottom: '16px' }}>
            <ModelSelector onModelSelect={(id, apiKey) => setModelConfig({ id, apiKey })} />
          </div>

          {selectedFiles.length > 0 && (
            <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--accent)', marginBottom: '16px' }}>
              <strong>📎 {selectedFiles.length} files selected:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {selectedFiles.map(f => (
                  <span key={f.sha} style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
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
