'use client';
import { useState } from 'react';
import { addUniversity } from '@/app/exam-portal/actions';

interface AddUniversityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddUniversityModal({ isOpen, onClose, onSuccess }: AddUniversityModalProps) {
  const [newUniName, setNewUniName] = useState('');
  const [newUniSlug, setNewUniSlug] = useState('');
  const [newUniFullName, setNewUniFullName] = useState('');
  const [isAddingUni, setIsAddingUni] = useState(false);

  if (!isOpen) return null;

  const handleAddUniversity = async () => {
    if (!newUniName || !newUniSlug) return;
    setIsAddingUni(true);
    try {
      await addUniversity(newUniName, newUniSlug, newUniFullName);
      onSuccess();
      setNewUniName('');
      setNewUniSlug('');
      setNewUniFullName('');
    } catch (e) {
      alert('Failed to add university');
    }
    setIsAddingUni(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="card" style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Add New University</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>University Full Name</label>
            <input 
              type="text" 
              value={newUniFullName} 
              onChange={e => setNewUniFullName(e.target.value)} 
              placeholder="e.g. Stanford University"
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Short Name (Abbreviation)</label>
            <input 
              type="text" 
              value={newUniName} 
              onChange={e => setNewUniName(e.target.value)} 
              placeholder="e.g. Stanford"
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Slug (For GitHub Repo)</label>
            <input 
              type="text" 
              value={newUniSlug} 
              onChange={e => setNewUniSlug(e.target.value)} 
              placeholder="e.g. stanford-university"
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>This will create a new repository: UniExamPrep/{newUniSlug || '...'}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button 
            onClick={onClose} 
            style={{ padding: '8px 16px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button 
            onClick={handleAddUniversity} 
            disabled={isAddingUni || !newUniName || !newUniSlug}
            className="action-btn" 
            style={{ padding: '8px 16px', background: 'var(--accent)', color: 'white', borderRadius: '6px', opacity: (isAddingUni || !newUniName || !newUniSlug) ? 0.7 : 1 }}
          >
            {isAddingUni ? 'Creating...' : 'Add University'}
          </button>
        </div>
      </div>
    </div>
  );
}
