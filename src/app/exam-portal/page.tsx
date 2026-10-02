'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ExamPortalPage() {
  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('ai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsKeySaved(true);
    }
  }, []);

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('ai_api_key', apiKey.trim());
      setIsKeySaved(true);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-xl tracking-tight">
              GEHU-DocKeeper
            </Link>
            <span className="text-[var(--text-tertiary)]">/</span>
            <span className="font-medium text-[var(--accent)]">Exam Portal (AI)</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        {!isKeySaved ? (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-8 shadow-sm">
            <div className="mb-8 text-center">
              <div className="w-16 h-16 bg-[var(--accent-light)] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h1 className="text-2xl font-bold mb-2">Connect Your AI Assistant</h1>
              <p className="text-[var(--text-secondary)]">
                To generate custom study materials, 1-pagers, and detailed topic explanations, 
                please enter your Google Gemini or OpenAI API Key.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--accent)]"
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-2">
                  Your key is stored locally in your browser and never sent to our servers.
                </p>
              </div>
              <button
                onClick={handleSaveKey}
                disabled={!apiKey.trim()}
                className="w-full py-2.5 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Connect & Continue
              </button>
            </div>
          </div>
        ) : (
          <ExamWizard />
        )}
      </main>
    </div>
  );
}

import { getDepartments, getBranches, getSubjects } from './actions';

function ExamWizard() {
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
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-sm overflow-hidden">
      {/* Wizard Progress */}
      <div className="flex border-b border-[var(--border-color)]">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`flex-1 text-center py-3 text-sm font-medium ${
              step >= s ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-tertiary)]'
            }`}
          >
            Step {s}
          </div>
        ))}
      </div>

      <div className="p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Select Subject</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <select 
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg"
                >
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Branch / Specialization</label>
                <select 
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={!departmentId}
                  className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg disabled:opacity-50"
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <select 
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={!branchId}
                  className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg disabled:opacity-50"
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
              className="w-full py-2.5 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity mt-4"
            >
              Next: Syllabus & Content
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Confirm Syllabus</h2>
            <p className="text-[var(--text-secondary)] text-sm">
              We found the following syllabus for <strong>{subjects.find(s => s.id === subjectId)?.name}</strong>. Please confirm it's correct.
            </p>
            
            <textarea
              className="w-full h-64 px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg font-mono text-sm resize-none"
              defaultValue={`Unit 1: Introduction to Networks...\nUnit 2: Application Layer...\nUnit 3: Transport Layer...`}
            />

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Confirm Syllabus
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Exam Parameters</h2>
            <p className="text-[var(--text-secondary)] text-sm">
              Tell us a bit about your exam so the AI can tailor the detail of the study notes.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Marks per question (Average)</label>
                <input
                  type="number"
                  placeholder="e.g. 10"
                  className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg"
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Determines how detailed each topic explanation will be.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Total questions in exam</label>
                <input
                  type="number"
                  placeholder="e.g. 5"
                  className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-2.5 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <span>✨</span> Generate Study Portal
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 text-center py-8">
            <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-bold">Analyzing PYQs & Syllabus...</h2>
            <p className="text-[var(--text-secondary)]">Please wait while the AI generates your custom study portal.</p>
          </div>
        )}
      </div>
    </div>
  );
}
