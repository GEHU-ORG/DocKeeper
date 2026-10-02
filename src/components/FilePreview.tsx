'use client';

import { useState, useEffect } from 'react';
import { getFileCategory } from '@/lib/github';
import { VideoPlayer } from './VideoPlayer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FilePreviewProps {
  isOpen: boolean;
  fileName: string;
  fileUrl: string;
  onClose: () => void;
}

export function FilePreview({ isOpen, fileName, fileUrl, onClose }: FilePreviewProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  const isVirtual = fileUrl?.startsWith('/virtual/');
  const category = isVirtual ? 'markdown' : getFileCategory(fileName);

  useEffect(() => {
    if (isOpen && fileUrl && (category === 'text' || category === 'code' || isVirtual)) {
      setIsLoading(true);
      setError(null);
      setTextContent(null);
      setIsOwner(false);

      if (fileUrl.startsWith('/virtual/pyq-generate/')) {
        // e.g. /virtual/pyq-generate/repo/subjectPathBase64/pdfSha/pdfNameBase64
        const parts = fileUrl.split('/');
        const repo = parts[3];
        const subjectPath = decodeURIComponent(parts[4]);
        const sha = parts[5];
        const pdfName = decodeURIComponent(parts[6]);

        setIsLoading(false);
        setTextContent('');
        
        fetch('/api/study/generate-pyq-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo, subjectPath, pdfFile: { sha, name: pdfName, repo } })
        }).then(res => {
          if (!res.ok) throw new Error('Failed to start generation');
          const reader = res.body?.getReader();
          if (!reader) throw new Error('No reader available');
          
          const decoder = new TextDecoder();
          let buffer = '';

          const processStream = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.startsWith('event: ')) {
                  const eventMatch = line.match(/event: ([\s\S]*?)\ndata: ([\s\S]*)/);
                  if (eventMatch) {
                    const eventName = eventMatch[1];
                    const data = JSON.parse(eventMatch[2]);
                    
                    if (eventName === 'chunk') {
                      setTextContent(prev => (prev || '') + data.text);
                    } else if (eventName === 'status') {
                      // Optional: could show status in UI, but textContent streaming is enough
                    } else if (eventName === 'complete') {
                      setIsOwner(true);
                      setIsPublic(data.isPublic);
                      // Update the URL in parent component to point to the actual answer? Not strictly necessary if we just keep showing it.
                    } else if (eventName === 'error') {
                      setError(data.error);
                    }
                  }
                }
              }
            }
          };
          processStream();
        }).catch(err => setError(err.message));
        
      } else if (isVirtual) {
        const [, , type, id] = fileUrl.split('/');
        const url = `/api/study/my-ai-content?type=${type}&id=${id}&subjectPath=dummy`;
        fetch(url)
          .then(res => {
            if (!res.ok) throw new Error('Failed to load AI content');
            return res.json();
          })
          .then(data => {
            if (type === 'notes') {
              setTextContent(data.messages?.[0]?.content || 'No content found');
            } else {
              setTextContent(data.content || 'No content found');
            }
            setIsOwner(!!data.isOwner);
            setIsPublic(!!data.isPublic);
          })
          .catch(err => setError(err.message))
          .finally(() => setIsLoading(false));
      } else {
        fetch(fileUrl)
          .then(res => {
            if (!res.ok) throw new Error('Failed to load content');
            return res.text();
          })
          .then(text => setTextContent(text))
          .catch(err => setError(err.message))
          .finally(() => setIsLoading(false));
      }
    }
  }, [isOpen, fileUrl, category, isVirtual]);

  const togglePrivacy = async () => {
    if (!isVirtual) return;
    const [, , type, id] = fileUrl.split('/');
    setIsToggling(true);
    try {
      const res = await fetch(`/api/study/my-ai-content?type=${type}&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isPublic })
      });
      if (res.ok) {
        setIsPublic(!isPublic);
      }
    } catch (e) {
      console.error(e);
    }
    setIsToggling(false);
  };

  if (!isOpen) return null;

  const renderPreview = () => {
    switch (category) {
      case 'markdown':
        return (
          <div className="preview-markdown-container" style={{ 
            width: '100%', 
            height: '75vh', 
            background: 'var(--bg-primary)', 
            borderRadius: 'var(--radius-md)', 
            overflow: 'auto', 
            padding: '2rem 3rem', 
            color: 'var(--text-primary)',
            position: 'relative'
          }}>
            {isOwner && (
              <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                <button 
                  onClick={togglePrivacy} 
                  disabled={isToggling}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: isPublic ? 'var(--bg-secondary)' : 'var(--accent)',
                    color: isPublic ? 'var(--text-primary)' : '#000',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    opacity: isToggling ? 0.7 : 1
                  }}
                >
                  {isPublic ? '🌍 Public' : '🔒 Private'}
                </button>
              </div>
            )}
            {isLoading && <div className="loading-spinner" style={{ margin: '2rem auto' }} />}
            {error && <div style={{ color: 'var(--error)' }}>{error}</div>}
            {!isLoading && !error && textContent !== null && (
              <div className="prose prose-invert" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: isOwner ? '1rem' : '0' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {textContent}
                </ReactMarkdown>
              </div>
            )}
          </div>
        );
      case 'image':
        return (
          <div className="preview-image-container">
            <img src={fileUrl} alt={fileName} className="preview-image" />
          </div>
        );
      case 'video':
        return <VideoPlayer src={fileUrl} title={fileName} />;
      case 'audio':
        return (
          <div className="preview-audio-container">
            <div className="preview-audio-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <audio controls className="preview-audio" autoPlay={false}>
              <source src={fileUrl} />
              Your browser does not support the audio tag.
            </audio>
          </div>
        );
      case 'pdf':
        return (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
            className="preview-pdf"
            title={fileName}
            style={{ width: '100%', height: '70vh', border: 'none' }}
          />
        );
      case 'text':
      case 'code':
        return (
          <div className="preview-text-container" style={{ width: '100%', height: '65vh', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'auto', padding: '1rem', border: '1px solid var(--border-color)' }}>
            {isLoading && <div className="loading-spinner" style={{ margin: '2rem auto' }} />}
            {error && <div style={{ color: 'var(--error)' }}>{error}</div>}
            {!isLoading && !error && textContent !== null && (
              <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '14px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--text-primary)' }}>
                {textContent}
              </pre>
            )}
          </div>
        );
      default:
        return (
          <div className="preview-unsupported">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p>Preview not available for this file type</p>
            <a href={fileUrl} download={fileName} className="preview-download-btn">
              Download File
            </a>
          </div>
        );
    }
  };

  return (
    <div className="dialog-overlay preview-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <h3 className="preview-title">{fileName}</h3>
          <div className="preview-header-actions">
            <a
              href={fileUrl}
              download={fileName}
              className="action-btn"
              title="Download"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
            <button className="action-btn" onClick={onClose} title="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="preview-content">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}
