const fs = require('fs');

const missingRaw = fs.readFileSync('integrity_report.md', 'utf8').split('\n').filter(l => l.startsWith('- **'));
let subjects = {};

for (const line of missingRaw) {
  // line format: - **Notes**: `btech/CSE/sem 3/data structures/Notes/practicals/dsa-questions/TREES AND GRAPHS/Q9.c`
  const match = line.match(/- \*\*(.*?)\*\*: `(.*?)`/);
  if (match) {
    const repo = match[1];
    const path = match[2];
    
    let parts = path.split('/');
    // Extract subject name roughly
    let subject = "General";
    
    if (path.includes('Year 1/common/')) {
       subject = "B.Tech Year 1: " + parts[3];
    } else if (path.includes('projects/')) {
       subject = "B.Tech CSE Projects: " + parts[3];
    } else if (path.includes('sem ')) {
       subject = parts.slice(0, 4).join('/');
    } else {
       subject = parts.slice(0, 2).join('/');
    }
    
    if (!subjects[subject]) subjects[subject] = [];
    subjects[subject].push(path);
  }
}

let md = `# Migration Discrepancy Report\n\n`;
md += `This report outlines the files from the old repositories that are completely missing from the GEU repository. You can verify and move these manually or we can automate it.\n\n`;

for (const [subject, files] of Object.entries(subjects)) {
  md += `### ${subject}\n`;
  md += `- **Expected missing files**: ${files.length}\n`;
  md += `- **Status in GEU**: ❌ Not Found\n\n`;
  for (const f of files.slice(0, 5)) {
    md += `  - \`${f}\`\n`;
  }
  if (files.length > 5) {
    md += `  - *(+ ${files.length - 5} more files)*\n`;
  }
  md += '\n';
}

fs.writeFileSync('missing_data_report.md', md);
