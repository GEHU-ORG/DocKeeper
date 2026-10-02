'use client';

interface ChatSection {
  type: 'overview' | 'concept' | 'qa' | 'pyq' | 'tip';
  title?: string;
  content?: string;
  question?: string;
  answer?: string;
  year?: string;
}

interface ChatFile {
  subject: string;
  generatedAt: string;
  model: string;
  sourceFiles: string[];
  sections: ChatSection[];
}

export function ChatRenderer({ data }: { data: ChatFile }) {
  const sectionConfig = {
    overview: { icon: '🧠', label: 'Overview', color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
    concept:  { icon: '💡', label: 'Concept',  color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)' },
    qa:       { icon: '❓', label: 'Q & A',    color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
    pyq:      { icon: '📅', label: 'PYQ',      color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    tip:      { icon: '⚡', label: 'Quick Tip', color: '#ec4899', bg: 'rgba(236,72,153,0.08)' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        borderRadius: '12px 12px 0 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '1.5rem' }}>📖</span>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{data.subject}</h2>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
          <span>✨ {data.model}</span>
          <span>📁 {data.sourceFiles?.join(', ')}</span>
          <span>🕒 {new Date(data.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}>
        {data.sections?.map((section, i) => {
          const config = sectionConfig[section.type] || sectionConfig.concept;
          return (
            <div
              key={i}
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-color)',
                background: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                transition: 'background 0.15s',
              }}
            >
              {/* Section label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: config.color, background: config.bg,
                  padding: '2px 8px', borderRadius: '4px',
                }}>
                  {config.icon} {section.title || config.label}{section.year ? ` · ${section.year}` : ''}
                </span>
              </div>

              {/* Content */}
              {section.type === 'qa' || section.type === 'pyq' ? (
                <div>
                  <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {section.question}
                  </p>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                    {section.answer}
                  </p>
                </div>
              ) : (
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                  {section.content}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
