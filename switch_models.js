const fs = require('fs');

const paths = [
  'src/components/ModelSelector.tsx',
  'src/app/api/account/api-key/route.ts',
  'src/app/api/study/extract-syllabus/route.ts',
  'src/app/api/study/generate-topic-note/route.ts',
  'src/app/api/study/generate-pyq-answer/route.ts',
  'src/app/api/study/generate-notes/route.tsx',
  'src/app/profile/page.tsx'
];

for (const p of paths) {
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    
    // Replace 2.5 with 3.1 everywhere
    content = content.replace(/gemini-2\.5-flash-lite/g, 'gemini-3.1-flash-lite');
    
    // In ModelSelector, update the display names too
    if (p.includes('ModelSelector.tsx') || p.includes('profile/page.tsx')) {
       content = content.replace(/Gemini 2\.5 Flash Lite/gi, 'Gemini 3.1 Flash Lite');
       content = content.replace(/Gemini 2\.5 Flash/g, 'Gemini 3.1 Flash');
       content = content.replace(/Gemini 2\.5 Pro/g, 'Gemini 3.1 Pro');
       content = content.replace(/gemini-2\.5-pro/g, 'gemini-3.1-pro');
       
       // Handle double flash-lite in dropdown
       content = content.replace(/gemini-3\.1-flash-lite<\/option>/g, 'gemini-3.1-flash-lite</option>');
    }
    
    fs.writeFileSync(p, content);
    console.log(`Updated ${p}`);
  }
}
