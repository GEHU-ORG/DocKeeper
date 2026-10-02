'use client';

import { useState, useEffect } from 'react';
import { getSubjectDetails, updateSubjectField, saveStudyNote, deleteStudyNote } from '@/app/exam-portal/actions';
import { ModelSelector } from './ModelSelector';

export function SubjectStudySpace({ subjectId, onBack }: { subjectId: string, onBack: () => void }) {
  const [subject, setSubject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [syllabus, setSyllabus] = useState('');
  const [pyqAnalysis, setPyqAnalysis] = useState('');
  
  // Notes state
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteMarks, setNewNoteMarks] = useState(5);
  const [newNoteContent, setNewNoteContent] = useState('');

  // AI state
  const [modelConfig, setModelConfig] = useState<{ id: string, apiKey: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  const fetchSubject = async () => {
    setLoading(true);
    const data = await getSubjectDetails(subjectId);
    if (data) {
      setSubject(data);
      setSyllabus(data.syllabus || '');
      setPyqAnalysis(data.pyqAnalysis || '');
      setNotes(data.studyNotes || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubject();
  }, [subjectId]);

  const handleSaveSyllabus = async () => {
    await updateSubjectField(subjectId, 'syllabus', syllabus);
    alert('Syllabus saved');
  };

  const handleSavePyq = async () => {
    await updateSubjectField(subjectId, 'pyqAnalysis', pyqAnalysis);
    alert('PYQ Analysis saved');
  };

  const handleSaveNote = async () => {
    if (!newNoteContent) return;
    await saveStudyNote(subjectId, newNoteMarks, newNoteContent);
    setNewNoteContent('');
    fetchSubject();
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm('Delete this note?')) {
      await deleteStudyNote(id);
      fetchSubject();
    }
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
Syllabus:
${syllabus || 'Not provided'}

PYQ (Previous Year Questions) Analysis:
${pyqAnalysis || 'Not provided'}
    `;

    const prompt1Pager = `You are an expert academic tutor. Based on the syllabus and PYQ analysis provided below, generate a high-yield, densely packed "1-Pager" study sheet. 
Focus only on the most critical concepts, heavily tested topics, and quick formulas/definitions. Make it highly scannable with bullet points and bold text.\n\n${baseContext}`;
    
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
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{subject?.name} - Study Space</h3>
        <button onClick={onBack} style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-primary)' }}>
          ← Back to Subjects
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Column: Resources CRUD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="card" style={{ padding: '16px' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>Syllabus</h4>
            <textarea 
              value={syllabus} 
              onChange={e => setSyllabus(e.target.value)} 
              placeholder="Paste the syllabus here..."
              style={{ width: '100%', minHeight: '100px', padding: '8px', marginBottom: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
            />
            <button onClick={handleSaveSyllabus} className="action-btn" style={{ background: 'var(--accent)', color: '#fff', padding: '6px 12px', fontSize: '0.9rem', width: 'max-content' }}>Save Syllabus</button>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>PYQ Analysis</h4>
            <textarea 
              value={pyqAnalysis} 
              onChange={e => setPyqAnalysis(e.target.value)} 
              placeholder="Paste previous year questions or analysis here..."
              style={{ width: '100%', minHeight: '100px', padding: '8px', marginBottom: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
            />
            <button onClick={handleSavePyq} className="action-btn" style={{ background: 'var(--accent)', color: '#fff', padding: '6px 12px', fontSize: '0.9rem', width: 'max-content' }}>Save PYQ Analysis</button>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>Study Notes</h4>
            {notes.map(note => (
              <div key={note.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-tertiary)', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--accent)', marginRight: '8px' }}>{note.marks} Marks</span>
                  <span style={{ fontSize: '0.9rem' }}>{note.content.substring(0, 30)}...</span>
                </div>
                <button onClick={() => handleDeleteNote(note.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <input type="number" value={newNoteMarks} onChange={e => setNewNoteMarks(Number(e.target.value))} style={{ width: '60px', padding: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }} />
              <input type="text" value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)} placeholder="Add a note..." style={{ flex: 1, padding: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }} />
              <button onClick={handleSaveNote} className="action-btn" style={{ background: 'var(--accent)', color: '#fff', padding: '6px 12px', width: 'max-content' }}>Add</button>
            </div>
          </div>
        </div>

        {/* Right Column: AI Generation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '1.2rem' }}>AI Study Engine</h4>
            
            <div style={{ marginBottom: '16px' }}>
              <ModelSelector onModelSelect={(id, apiKey) => setModelConfig({ id, apiKey })} />
            </div>

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
