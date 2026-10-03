'use client';

import { useState, useEffect } from 'react';
import { type FileItem } from '@/lib/github';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SyllabusTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectPath: string;
  repo: string;
  pdfFile: FileItem | null;
}

interface SyllabusUnit {
  _id?: string;
  unitNumber: number;
  unitTitle: string;
  topics: string[];
}

export function SyllabusTrackerModal({ isOpen, onClose, subjectPath, repo, pdfFile }: SyllabusTrackerModalProps) {
  const [phase, setPhase] = useState<'idle' | 'extracting' | 'ready'>('idle');
  const [units, setUnits] = useState<SyllabusUnit[]>([]);
  const [syllabusId, setSyllabusId] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  
  const [topicNotes, setTopicNotes] = useState<Record<string, string>>({});
  const [generatingTopic, setGeneratingTopic] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && phase === 'idle' && pdfFile) {
      extractSyllabus();
    }
    if (!isOpen) {
      setPhase('idle');
      setUnits([]);
      setExpandedUnit(null);
      setActiveTopic(null);
      setTopicNotes({});
    }
  }, [isOpen]);

  const extractSyllabus = async () => {
    setPhase('extracting');
    setError('');
    try {
      const res = await fetch('/api/study/extract-syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, subjectPath, pdfFile })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse syllabus');
      
      setUnits(data.units);
      setSyllabusId(data.syllabusId);
      
      if (data.notesMap) {
        setTopicNotes(data.notesMap);
      }

      setPhase('ready');
      if (data.units.length > 0) setExpandedUnit(data.units[0].unitNumber);
    } catch (err: any) {
      setError(err.message);
      setPhase('idle');
    }
  };

  const handleTopicClick = async (topic: string) => {
    if (activeTopic === topic) return; // already open
    setActiveTopic(topic);
    
    // If we already have it, do nothing
    if (topicNotes[topic]) return;

    setGeneratingTopic(topic);
    try {
      const res = await fetch('/api/study/generate-topic-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syllabusId, topicName: topic, subjectPath })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate note');
      
      setTopicNotes(prev => ({ ...prev, [topic]: data.note.content }));
    } catch (err: any) {
      console.error(err);
      setTopicNotes(prev => ({ ...prev, [topic]: `*Error generating note: ${err.message}*` }));
    } finally {
      setGeneratingTopic(null);
    }
  };

  if (!isOpen || !pdfFile) return null;

  return (
    <div className="dialog-overlay" onClick={onClose} style={{ zIndex: 100 }}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%', height: '85vh', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h3 className="dialog-title" style={{ margin: 0 }}>📚 Intelligent Syllabus Tracker</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{pdfFile.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
        </div>
        
        {phase === 'extracting' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            <div className="loading-spinner" style={{ width: '48px', height: '48px', borderWidth: '3px' }} />
            <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1.1rem' }}>Parsing Syllabus Structure...</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', maxWidth: '300px' }}>
              The AI is reading the PDF and structuring your course into interactive Units and Topics.
            </p>
          </div>
        )}

        {error && <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>{error}</div>}

        {phase === 'ready' && (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '16px' }}>
            
            {/* Left Sidebar: Syllabus Outline */}
            <div style={{ width: '300px', overflowY: 'auto', borderRight: '1px solid var(--border-color)', paddingRight: '12px' }}>
              {units.map((unit) => (
                <div key={unit.unitNumber} style={{ marginBottom: '8px' }}>
                  <button
                    onClick={() => setExpandedUnit(expandedUnit === unit.unitNumber ? null : unit.unitNumber)}
                    style={{
                      width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px', background: expandedUnit === unit.unitNumber ? 'var(--bg-secondary)' : 'transparent',
                      border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      textAlign: 'left', color: 'var(--text-primary)', fontWeight: 600
                    }}
                  >
                    <span>Unit {unit.unitNumber}: {unit.unitTitle}</span>
                    <span>{expandedUnit === unit.unitNumber ? '▼' : '▶'}</span>
                  </button>
                  
                  {expandedUnit === unit.unitNumber && (
                    <div style={{ padding: '8px 0 8px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {unit.topics.map((topic, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleTopicClick(topic)}
                          style={{
                            textAlign: 'left', padding: '8px 12px', background: 'transparent',
                            border: 'none', borderLeft: activeTopic === topic ? '2px solid var(--accent)' : '2px solid transparent',
                            color: activeTopic === topic ? 'var(--accent)' : 'var(--text-secondary)',
                            cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}
                        >
                          <span style={{ flex: 1, paddingRight: '8px' }}>{topic}</span>
                          {topicNotes[topic] && <span title="AI Note Available">✅</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right Pane: Topic Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
              {!activeTopic ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>📖</div>
                  <p>Select a topic from the syllabus to generate targeted study notes.</p>
                </div>
              ) : (
                <div>
                  <h2 style={{ color: 'var(--text-primary)', marginBottom: '24px', fontSize: '1.5rem' }}>{activeTopic}</h2>
                  
                  {generatingTopic === activeTopic ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '16px' }}>
                      <div className="loading-spinner" style={{ width: '32px', height: '32px' }} />
                      <div style={{ color: 'var(--accent)' }}>Generating detailed notes for this topic...</div>
                    </div>
                  ) : topicNotes[activeTopic] ? (
                    <div className="prose prose-invert" style={{ maxWidth: 'none', color: 'var(--text-primary)' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {topicNotes[activeTopic]}
                      </ReactMarkdown>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
