const fs = require('fs');
const css = `
/* ======================================================
   AI Markdown Content (Replaces Tailwind Prose)
   ====================================================== */
.ai-markdown-content {
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.7;
  max-width: 100%; /* Use full width */
  width: 100%;
}

.ai-markdown-content > *:first-child {
  margin-top: 0;
}

.ai-markdown-content h1, 
.ai-markdown-content h2, 
.ai-markdown-content h3, 
.ai-markdown-content h4 {
  color: var(--text-primary);
  font-weight: 700;
  margin-top: 2em;
  margin-bottom: 1em;
}

.ai-markdown-content h1 { font-size: 2rem; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
.ai-markdown-content h2 { font-size: 1.5rem; }
.ai-markdown-content h3 { font-size: 1.25rem; }

.ai-markdown-content p {
  margin-bottom: 1.5em;
}

.ai-markdown-content ul, 
.ai-markdown-content ol {
  margin-bottom: 1.5em;
  padding-left: 1.5em;
}

.ai-markdown-content li {
  margin-bottom: 0.5em;
}

.ai-markdown-content strong {
  font-weight: 600;
  color: var(--text-primary);
}

.ai-markdown-content hr {
  border: 0;
  border-top: 1px solid var(--border-color);
  margin: 2em 0;
}

.ai-markdown-content blockquote {
  border-left: 4px solid var(--accent);
  padding-left: 1rem;
  color: var(--text-secondary);
  font-style: italic;
  margin: 1.5em 0;
}

.ai-markdown-content code {
  background: var(--bg-hover);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
}

.ai-markdown-content pre {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 1rem;
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin-bottom: 1.5em;
}

.ai-markdown-content pre code {
  background: transparent;
  padding: 0;
  color: var(--text-primary);
}

/* --- Responsive Tables --- */
.ai-markdown-content table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2em;
  display: block;
  overflow-x: auto; /* Fix for cut off tables! */
  white-space: nowrap;
}

.ai-markdown-content th,
.ai-markdown-content td {
  border: 1px solid var(--border-color);
  padding: 12px 16px;
  text-align: left;
}

.ai-markdown-content th {
  background: var(--bg-tertiary);
  font-weight: 600;
}

/* --- Math Equations --- */
.ai-markdown-content .katex-display {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 1em 0;
  margin: 0;
}

/* --- Chat Question Bubble --- */
.chat-question-bubble {
  background-color: var(--accent); /* ChatGPT Blue/Accent */
  color: white;
  padding: 16px 20px;
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  margin-top: 2em;
  margin-bottom: 1.5em;
  box-shadow: var(--shadow-sm);
  display: inline-block;
  max-width: 90%;
}

.chat-question-bubble h3 {
  color: white !important;
  margin: 0 !important;
  font-size: 1.1rem !important;
  line-height: 1.5;
}
`;
fs.appendFileSync('src/app/globals.css', css);
console.log('CSS appended');
