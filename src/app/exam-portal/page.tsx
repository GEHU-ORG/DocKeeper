'use client';
import { useState, useEffect } from 'react';
import { getUniversities, getDepartments, getBranches, getSemesters, getSubjects } from './actions';
import { ChatBox } from '@/components/ChatBox';
import { AdBanner } from '@/components/AdBanner';

export default function ExamPortalPage() {
  const [step, setStep] = useState(1);

  // Data State
  const [universities, setUniversities] = useState<{id: string, name: string, slug: string}[]>([]);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [semesters, setSemesters] = useState<{id: string, name: string, number: number}[]>([]);
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);

  // Form State
  const [universityId, setUniversityId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  // Fetch universities on load
  useEffect(() => {
    getUniversities().then(setUniversities);
  }, []);

  // Cascade: University → Departments
  useEffect(() => {
    if (universityId) {
      getDepartments(universityId).then(setDepartments);
      setDepartmentId(''); setBranchId(''); setSemesterId(''); setSubjectId('');
    }
  }, [universityId]);

  // Cascade: Department → Branches
  useEffect(() => {
    if (departmentId) {
      getBranches(departmentId).then(setBranches);
      setBranchId(''); setSemesterId(''); setSubjectId('');
    }
  }, [departmentId]);

  // Cascade: Branch → Semesters
  useEffect(() => {
    if (branchId) {
      getSemesters(branchId).then(setSemesters);
      setSemesterId(''); setSubjectId('');
    }
  }, [branchId]);

  // Cascade: Semester → Subjects
  useEffect(() => {
    if (semesterId) {
      getSubjects(semesterId).then(setSubjects);
      setSubjectId('');
    }
  }, [semesterId]);

  const selectStyle = (disabled: boolean) => ({
    width: '100%',
    padding: '12px 16px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-md)',
    fontSize: '1rem',
    color: 'var(--text-primary)',
    outline: 'none',
    opacity: disabled ? 0.5 : 1
  });

  const labelStyle = {
    display: 'block' as const,
    fontSize: '0.875rem',
    fontWeight: 600,
    marginBottom: '8px',
    color: 'var(--text-secondary)'
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
          <span style={{ color: 'var(--accent)' }}>📚</span> UniExamPrep
        </h1>
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
          {['University', 'Subject', 'Syllabus', 'Exam', 'Study'].map((label, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '16px 0',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: step >= i + 1 ? 'var(--accent)' : 'var(--text-tertiary)',
                borderBottom: step >= i + 1 ? '3px solid var(--accent)' : '3px solid transparent',
                transition: 'all var(--transition-fast)'
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div style={{ padding: '40px' }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Select Your University & Subject</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>University</label>
                  <select 
                    value={universityId}
                    onChange={(e) => setUniversityId(e.target.value)}
                    style={selectStyle(false)}
                  >
                    <option value="">Select University</option>
                    {universities.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Department</label>
                  <select 
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    disabled={!universityId}
                    style={selectStyle(!universityId)}
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Branch / Specialization</label>
                  <select 
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    disabled={!departmentId}
                    style={selectStyle(!departmentId)}
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Semester</label>
                  <select 
                    value={semesterId}
                    onChange={(e) => setSemesterId(e.target.value)}
                    disabled={!branchId}
                    style={selectStyle(!branchId)}
                  >
                    <option value="">Select Semester</option>
                    {semesters.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Subject</label>
                  <select 
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    disabled={!semesterId}
                    style={selectStyle(!semesterId)}
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
                  We found the following syllabus for <strong>{subjects.find(s => s.id === subjectId)?.name}</strong>. Please confirm or paste your own.
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
                defaultValue={`Unit 1: Introduction...\nUnit 2: Core Concepts...\nUnit 3: Advanced Topics...`}
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
                  Configure your exam format so the AI tailors the study material accordingly.
                </p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Marks per question (Average)</label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: '1rem', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={labelStyle}>Total questions in exam</label>
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

          {step === 5 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 16px 0' }}>Your Study Portal is Ready</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                Ask the AI anything about <strong>{subjects.find(s => s.id === subjectId)?.name}</strong> using the chat below.
              </p>
            </div>
          )}
        </div>
      </div>
      <AdBanner dataAdSlot="0987654321" />
      {(step === 4 || step === 5) && <ChatBox />}
    </div>
  );
}
