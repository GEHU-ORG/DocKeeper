'use client';

import { useState } from 'react';

interface NewFolderDialogProps {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

export function NewFolderDialog({ isOpen, title = 'New Folder', onClose, onConfirm }: NewFolderDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(`${title} name cannot be empty`);
      return;
    }
    if (trimmed.includes('/')) {
      setError(`${title} name cannot contain /`);
      return;
    }
    onConfirm(trimmed);
    setName('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder={`${title} name`}
            className="dialog-input"
            autoFocus
          />
          {error && <p className="dialog-error">{error}</p>}
          <div className="dialog-actions">
            <button type="button" className="dialog-btn dialog-btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="dialog-btn dialog-btn-confirm">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
