'use client';

import { useState, useEffect } from 'react';

const MODELS = [
  { id: 'gemini-1.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', url: 'https://aistudio.google.com/app/apikey' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', url: 'https://aistudio.google.com/app/apikey' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic', url: 'https://console.anthropic.com/settings/keys' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', url: 'https://platform.openai.com/api-keys' },
];

export function ModelSelector({ onModelSelect }: { onModelSelect: (modelId: string, apiKey: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Check on load if we already have the key
  useEffect(() => {
    const savedKey = localStorage.getItem(`${selectedModel.provider}_api_key`);
    if (savedKey) {
      onModelSelect(selectedModel.id, savedKey);
    }
  }, [selectedModel]);

  const handleSelect = (model: typeof MODELS[0]) => {
    setSelectedModel(model);
    setIsOpen(false);
    
    const savedKey = localStorage.getItem(`${model.provider}_api_key`);
    if (savedKey) {
      onModelSelect(model.id, savedKey);
    } else {
      setShowKeyPrompt(true);
    }
  };

  const handleSaveKey = () => {
    if (!apiKeyInput) return;
    localStorage.setItem(`${selectedModel.provider}_api_key`, apiKeyInput);
    setShowKeyPrompt(false);
    onModelSelect(selectedModel.id, apiKeyInput);
    setApiKeyInput('');
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <span>✨</span> {selectedModel.name}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: 0,
          marginBottom: '8px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          width: '240px',
          padding: '8px',
          zIndex: 100
        }}>
          {MODELS.map(model => (
            <button
              key={model.id}
              onClick={() => handleSelect(model)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                background: selectedModel.id === model.id ? 'var(--bg-active)' : 'transparent',
                color: selectedModel.id === model.id ? 'var(--accent)' : 'var(--text-primary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {model.name}
            </button>
          ))}
        </div>
      )}

      {showKeyPrompt && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '32px',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: '400px',
            boxShadow: 'var(--shadow-dialog)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>
              Add API Key for {selectedModel.name}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              We need your API key to generate notes. It is saved <b>locally in your browser</b> and never sent to our servers.
            </p>
            
            <a href={selectedModel.url} target="_blank" rel="noreferrer" style={{
              display: 'inline-block',
              marginBottom: '16px',
              color: 'var(--accent)',
              fontSize: '0.875rem',
              textDecoration: 'underline'
            }}>
              Get your free API key here
            </a>

            <input
              type="password"
              placeholder="Paste API Key here..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                outline: 'none',
                color: 'var(--text-primary)'
              }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowKeyPrompt(false)}
                style={{ flex: 1, padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveKey}
                style={{ flex: 1, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'white', fontWeight: 600 }}
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
