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
            <div className="animate-fade-in file-list">
              <div className="file-list-header readonly">
                <div className="file-row-icon" />
                <div className="file-row-name header-label">Select Your University</div>
                <div className="file-row-date header-label"></div>
                <div className="file-row-size header-label"></div>
                <div className="file-row-actions header-label"></div>
              </div>
              <div className="file-list-items">
                {universities.map(u => (
                  <div key={u.id} className="file-row readonly" onClick={() => { setUniversityId(u.id); handleNext(); }} style={{ cursor: 'pointer' }}>
                    <div className="file-row-icon">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                      </svg>
                    </div>
                    <div className="file-row-name">
                      <span className="file-name-text">{u.fullName || u.name}</span>
                    </div>
                    <div className="file-row-date">—</div>
                    <div className="file-row-size">—</div>
                    <div className="file-row-actions">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Course */}
          {step === 2 && (
            <div className="animate-fade-in file-list">
              <div className="file-list-header readonly">
                <div className="file-row-icon" />
                <div className="file-row-name header-label">
                  <button onClick={handlePrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', marginRight: '12px', fontSize: '1.2rem', padding: 0 }}>←</button>
                  Select Your Course
                </div>
                <div className="file-row-date header-label"></div>
                <div className="file-row-size header-label"></div>
                <div className="file-row-actions header-label"></div>
              </div>
              <div className="file-list-items">
                {courses.length > 0 ? courses.map(c => (
                  <div key={c.id} className="file-row readonly" onClick={() => { setCourseId(c.id); handleNext(); }} style={{ cursor: 'pointer' }}>
                    <div className="file-row-icon">
                      <svg width="28" height="28" viewBox="0 0 16 16" className="file-icon file-icon-folder">
                        <path fill="#FFC107" d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3m-8.322.12q.322-.119.684-.12h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981z"/>
                      </svg>
                    </div>
                    <div className="file-row-name">
                      <span className="file-name-text">{c.name}</span>
                    </div>
                    <div className="file-row-date">—</div>
                    <div className="file-row-size">—</div>
                    <div className="file-row-actions">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </div>
                )) : <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No courses available</div>}
              </div>
            </div>
          )}

          {/* STEP 3: Semester */}
          {step === 3 && (
            <div className="animate-fade-in file-list">
               <div className="file-list-header readonly">
                <div className="file-row-icon" />
                <div className="file-row-name header-label">
                  <button onClick={handlePrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', marginRight: '12px', fontSize: '1.2rem', padding: 0 }}>←</button>
                  Select Your Semester
                </div>
                <div className="file-row-date header-label"></div>
                <div className="file-row-size header-label"></div>
                <div className="file-row-actions header-label"></div>
              </div>
              <div className="file-list-items">
                {semesters.length > 0 ? semesters.map(s => (
                  <div key={s.id} className="file-row readonly" onClick={() => { setSemesterId(s.id); handleNext(); }} style={{ cursor: 'pointer' }}>
                    <div className="file-row-icon">
                      <svg width="28" height="28" viewBox="0 0 16 16" className="file-icon file-icon-folder">
                        <path fill="#FFC107" d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3m-8.322.12q.322-.119.684-.12h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981z"/>
                      </svg>
                    </div>
                    <div className="file-row-name">
                      <span className="file-name-text">{s.name}</span>
                    </div>
                    <div className="file-row-date">—</div>
                    <div className="file-row-size">—</div>
                    <div className="file-row-actions">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </div>
                )) : <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No semesters available</div>}
              </div>
            </div>
          )}

          {/* STEP 4: Subjects / ChatBox */}
          {step === 4 && (
            <div className="animate-fade-in file-list">
              <div className="file-list-header readonly">
                <div className="file-row-icon" />
                <div className="file-row-name header-label">
                  <button onClick={handlePrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', marginRight: '12px', fontSize: '1.2rem', padding: 0 }}>←</button>
                  Select Your Subject
                </div>
                <div className="file-row-date header-label"></div>
                <div className="file-row-size header-label"></div>
                <div className="file-row-actions header-label"></div>
              </div>
              
              {!subjectId ? (
                <div className="file-list-items">
                  {subjects.length > 0 ? subjects.map(s => (
                    <div key={s.id} className="file-row readonly" onClick={() => setSubjectId(s.id)} style={{ cursor: 'pointer' }}>
                      <div className="file-row-icon">
                        <svg width="28" height="28" viewBox="0 0 16 16" className="file-icon file-icon-folder">
                          <path fill="#FFC107" d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3m-8.322.12q.322-.119.684-.12h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981z"/>
                        </svg>
                      </div>
                      <div className="file-row-name">
                        <span className="file-name-text">{s.name}</span>
                      </div>
                      <div className="file-row-date">—</div>
                      <div className="file-row-size">—</div>
                      <div className="file-row-actions">
                        <button className="action-btn" style={{ background: 'var(--accent)', color: '#fff', borderRadius: '20px', padding: '4px 12px', width: 'auto', height: 'auto' }}>Study AI</button>
                      </div>
                    </div>
                  )) : <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No subjects available</div>}
                </div>
              ) : (
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Subject Study Space</h3>
                    <button onClick={() => setSubjectId('')} style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-primary)' }}>Change Subject</button>
                  </div>
                  <ChatBox />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
