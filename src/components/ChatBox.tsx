'use client';

import { useState } from 'react';
import { ModelSelector } from './ModelSelector';

export function ChatBox() {
  const [modelConfig, setModelConfig] = useState<{ id: string, apiKey: string } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!prompt.trim() || !modelConfig?.apiKey) return;
    
    setIsLoading(true);
    setResponse('');
    
    const userPrompt = prompt;
    setPrompt('');

    try {
      if (modelConfig.id.startsWith('gemini')) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.id}:generateContent?key=${modelConfig.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }]
          })
        });

        const data = await res.json();
        
        if (data.error) {
          setResponse(`Error: ${data.error.message}`);
        } else {
          setResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.');
        }
      } else {
        setResponse(`Integration for ${modelConfig.id} is coming soon! Try Gemini models for now.`);
      }
    } catch (error: any) {
      setResponse(`Request failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '800px',
      padding: '0 24px',
      zIndex: 100
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-dialog)',
        padding: '12px'
      }}>
        
        {/* Chat Response Area */}
        {(response || isLoading) && (
          <div style={{
            padding: '16px',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '8px',
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
            maxHeight: '400px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <div style={{ width: '16px', height: '16px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                AI is thinking...
                <style>{`
                  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
              </div>
            ) : (
              response
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask AI anything about the syllabus..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              resize: 'none',
              minHeight: '48px',
              maxHeight: '200px',
              fontFamily: 'var(--font-sans)',
              padding: '12px 8px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!prompt.trim() || !modelConfig?.apiKey || isLoading}
            style={{
              background: prompt.trim() && modelConfig?.apiKey && !isLoading ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: prompt.trim() && modelConfig?.apiKey && !isLoading ? 'white' : 'var(--text-tertiary)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: prompt.trim() && modelConfig?.apiKey && !isLoading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              flexShrink: 0,
              marginTop: '8px'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
          <ModelSelector onModelSelect={(id, apiKey) => setModelConfig({ id, apiKey })} />
          
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            {modelConfig?.apiKey ? 'Ready to chat' : 'Please select a model and add API key'}
          </div>
        </div>

      </div>
    </div>
  );
}
