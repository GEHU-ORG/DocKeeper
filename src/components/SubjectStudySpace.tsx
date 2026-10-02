'use client';

import { useState, useEffect } from 'react';
import { getSubjectDetails, updateSubjectField, saveStudyNote, deleteStudyNote } from '@/app/exam-portal/actions';
import { ModelSelector } from './ModelSelector';

export function SubjectStudySpace({ subjectId, subjectName, isReadOnly, selectedFiles = [] }: { subjectId: string, subjectName?: string, isReadOnly?: boolean, selectedFiles?: any[] }) {
  const [subject, setSubject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

    const baseContext = `
Subject: ${subject?.name || 'Unknown Subject'}
    `;
    if (!modelConfig?.apiKey) {
      alert('Please select a model and add your API key first.');
      return;
    }

    setAiLoading(true);
    setAiResponse('');

  const [modelConfig, setModelConfig] = useState<{ id: string, apiKey: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  const fetchSubject = async () => {
    setLoading(true);
    const data = await getSubjectDetails(subjectId);
    if (data) setSubject(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubject();
  }, [subjectId]);

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
Break down each unit, explain the core concepts required for the exam, and provide step-by-step guidance on how to tackle the expected questions from the PYQs.\n\n${baseContext}`;

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
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{subjectName || subject?.name} - Study Space</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '1.2rem' }}>AI Study Engine</h4>
            
            <div style={{ marginBottom: '16px' }}>
              <ModelSelector onModelSelect={(id, apiKey) => setModelConfig({ id, apiKey })} />
            </div>

            {selectedFiles && selectedFiles.length > 0 && (
              <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--accent)', marginBottom: '16px' }}>
                <strong>📎 Using {selectedFiles.length} selected files as context:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '0.9rem' }}>
                  {selectedFiles.map(f => (
                    <li key={f.id}>{f.name}</li>
                  ))}
                </ul>
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

            {aiLoading && <div style={{ color: 'var(--accent)', padding: '16px', textAlign: 'center' }}>AI is thinking...</div>}
            
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
    </div>
  );
}
