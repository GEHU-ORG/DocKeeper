'use client';
import { useState, useEffect } from 'react';
import { getUniversities, getCourses, getSemesters, getSubjects } from './actions';
import { ChatBox } from '@/components/ChatBox';

export default function ExamPortalPage() {
  const [step, setStep] = useState(1);

  // Data State
  const [universities, setUniversities] = useState<{id: string, name: string, slug: string, fullName?: string | null}[]>([]);
  const [courses, setCourses] = useState<{id: string, name: string}[]>([]);
  const [semesters, setSemesters] = useState<{id: string, name: string, number: number}[]>([]);
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);

  // Form State
  const [universityId, setUniversityId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  // Fetch universities on load
  useEffect(() => {
    getUniversities().then(setUniversities);
  }, []);

  // Cascade: University → Courses
  useEffect(() => {
    if (universityId) {
      getCourses(universityId).then(setCourses);
      setCourseId(''); setSemesterId(''); setSubjectId('');
    }
  }, [universityId]);

  // Cascade: Course → Semesters
  useEffect(() => {
    if (courseId) {
      getSemesters(courseId).then(setSemesters);
      setSemesterId(''); setSubjectId('');
    }
  }, [courseId]);

  // Cascade: Semester → Subjects
  useEffect(() => {
    if (semesterId) {
      getSubjects(semesterId).then(setSubjects);
      setSubjectId('');
    }
  }, [semesterId]);

  const handleNext = () => setStep((s) => Math.min(s + 1, 4));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-sans)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Welcome to the Exam Portal
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Select your university and course to instantly access AI-generated study notes, syllabus, and PYQ analysis tailored to your current semester.
        </p>
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', flex: 1, position: 'relative' }}>
        
        {/* Progress Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
          {['University', 'Course', 'Semester', 'Subject'].map((label, idx) => (
            <div key={label} style={{ flex: 1, padding: '16px 12px', textAlign: 'center', fontSize: '0.875rem', fontWeight: 600, borderRight: idx < 3 ? '1px solid var(--border-color)' : 'none', color: step >= idx + 1 ? 'var(--accent)' : 'var(--text-tertiary)', position: 'relative', cursor: step >= idx + 1 ? 'pointer' : 'default' }} onClick={() => { if (step >= idx + 1) setStep(idx + 1); }}>
              {label}
              {step === idx + 1 && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'var(--accent)' }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: '32px' }}>
          
          {/* STEP 1: University */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>Select Your University</h2>
              <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                {universities.map(u => (
                  <button key={u.id} onClick={() => { setUniversityId(u.id); handleNext(); }} style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: `2px solid ${universityId === u.id ? 'var(--accent)' : 'var(--border-strong)'}`, background: universityId === u.id ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                    {u.fullName || u.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Course */}
          {step === 2 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button onClick={handlePrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>← Back</button>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Select Your Course</h2>
              </div>
              <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                {courses.length > 0 ? courses.map(c => (
                  <button key={c.id} onClick={() => { setCourseId(c.id); handleNext(); }} style={{ padding: '20px', borderRadius: 'var(--radius-md)', border: `2px solid ${courseId === c.id ? 'var(--accent)' : 'var(--border-color)'}`, background: courseId === c.id ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {c.name}
                  </button>
                )) : (
                  <div style={{ color: 'var(--text-tertiary)', gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center' }}>No courses available for this university.</div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Semester */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button onClick={handlePrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>← Back</button>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Select Your Semester</h2>
              </div>
              <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                {semesters.length > 0 ? semesters.map(s => (
                  <button key={s.id} onClick={() => { setSemesterId(s.id); handleNext(); }} style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: `2px solid ${semesterId === s.id ? 'var(--accent)' : 'var(--border-color)'}`, background: semesterId === s.id ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                    {s.name}
                  </button>
                )) : (
                  <div style={{ color: 'var(--text-tertiary)', gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center' }}>No semesters available for this course.</div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Subject */}
          {step === 4 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button onClick={handlePrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>← Back</button>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Select Your Subject</h2>
              </div>
              <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr' }}>
                {subjects.length > 0 ? subjects.map(s => (
                  <button key={s.id} onClick={() => { setSubjectId(s.id); }} style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: `2px solid ${subjectId === s.id ? 'var(--accent)' : 'var(--border-color)'}`, background: subjectId === s.id ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{s.name}</span>
                    <span style={{ color: 'var(--accent)' }}>View Materials →</span>
                  </button>
                )) : (
                  <div style={{ color: 'var(--text-tertiary)', padding: '40px 0', textAlign: 'center' }}>No subjects available for this semester.</div>
                )}
              </div>
              
              {subjectId && (
                <div style={{ marginTop: '32px', padding: '24px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: 'var(--radius-lg)', color: '#047857', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Success! You are ready to study.</h3>
                  <p>In the next update, this will redirect to the subject dashboard with full PYQ analysis and study materials.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {(step === 4) && <ChatBox />}
    </div>
  );
}
