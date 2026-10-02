'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDepartments, getBranches, getSubjects } from './actions';

export default function ExamPortalPage() {
  const [step, setStep] = useState(1);

  // Data State
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);

  // Form State
  const [departmentId, setDepartmentId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  // Fetch departments on load
  useEffect(() => {
    getDepartments().then(setDepartments);
  }, []);

  // Fetch branches when department changes
  useEffect(() => {
    if (departmentId) {
      getBranches(departmentId).then(setBranches);
      setBranchId('');
      setSubjectId('');
    }
  }, [departmentId]);

  // Fetch subjects when branch changes
  useEffect(() => {
    if (branchId) {
      getSubjects(branchId).then(setSubjects);
      setSubjectId('');
    }
  }, [branchId]);

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
          <span style={{ color: 'var(--accent)' }}>✨</span> Exam Portal
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
          AI-powered study guides, 1-pagers, and detailed notes generated directly from your syllabus.
        </p>
      </div>

      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden'
      }}>
        
        {/* Wizard Progress */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '16px 0',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: step >= s ? 'var(--accent)' : 'var(--text-tertiary)',
                borderBottom: step >= s ? '3px solid var(--accent)' : '3px solid transparent',
                transition: 'all var(--transition-fast)'
              }}
            >
              Step {s}
            </div>
          ))}
        </div>

        <div style={{ padding: '40px' }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Select Your Subject</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>Department</label>
                  <select 
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: '1rem', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>Branch / Specialization</label>
                  <select 
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    disabled={!departmentId}
                    style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: '1rem', color: 'var(--text-primary)', outline: 'none', opacity: !departmentId ? 0.5 : 1 }}
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>Subject</label>
                  <select 
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    disabled={!branchId}
                    style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: '1rem', color: 'var(--text-primary)', outline: 'none', opacity: !branchId ? 0.5 : 1 }}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!subjectId}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: subjectId ? 'pointer' : 'not-allowed',
                  opacity: subjectId ? 1 : 0.5,
                  marginTop: '16px',
                  transition: 'opacity 0.2s'
                }}
              >
                Next: Verify Syllabus
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px 0' }}>Confirm Syllabus</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                  We found the following syllabus for <strong>{subjects.find(s => s.id === subjectId)?.name}</strong>. Please confirm it's correct or paste your own.
                </p>
              </div>
              
              <textarea
                style={{
                  width: '100%',
                  height: '250px',
                  padding: '16px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)',
                  resize: 'none',
                  outline: 'none'
                }}
                defaultValue={`Unit 1: Introduction to Networks...\nUnit 2: Application Layer...\nUnit 3: Transport Layer...`}
              />

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setStep(1)}
                  style={{ flex: 1, padding: '14px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  style={{ flex: 2, padding: '14px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Confirm Syllabus
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px 0' }}>Exam Parameters</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                  Tell us a bit about your exam format so the AI can tailor the depth of the study notes.
                </p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>Marks per question (Average)</label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: '1rem', color: 'var(--text-primary)', outline: 'none' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '8px', margin: 0 }}>Determines how detailed each topic explanation will be.</p>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>Total questions in exam</label>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: '1rem', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={() => setStep(2)}
                  style={{ flex: 1, padding: '14px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  style={{ flex: 2, padding: '14px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <span>✨</span> Generate Study Portal
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '64px', height: '64px', border: '4px solid var(--accent-light)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '24px' }}></div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px 0' }}>Analyzing PYQs & Syllabus...</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0 }}>Please wait while the AI generates your custom study portal.</p>
              
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
