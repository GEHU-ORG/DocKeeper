const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
const fs = require('fs');

async function getTree(repo) {
  try {
    const { data: ref } = await octokit.git.getRef({ owner: 'UniExamPrep', repo, ref: 'heads/main' });
    const { data: commit } = await octokit.git.getCommit({ owner: 'UniExamPrep', repo, commit_sha: ref.object.sha });
    const { data: tree } = await octokit.git.getTree({ owner: 'UniExamPrep', repo, tree_sha: commit.tree.sha, recursive: '1' });
    return tree.tree.filter(i => i.type === 'blob' && !i.path.endsWith('.keep') && i.path !== 'README.md');
  } catch (e) {
    if (e.status === 404 || e.status === 409) return [];
    console.error(`Error fetching ${repo}:`, e.message);
    return [];
  }
}

async function run() {
  const notesBlobs = await getTree('Notes');
  const pyqBlobs = await getTree('PYQ');
  const syllabusBlobs = await getTree('Syllabus');
  const geuBlobs = await getTree('GEU');

  let expected = {}; // path in GEU -> expected source path

  // Map PYQ files
  // If PYQ repo had path: B.Tech/CSE/Semester-1/Maths/file.pdf
  // It should be mapped in GEU as: B.Tech/CSE/Semester-1/Maths/PYQ/file.pdf
  for (const item of pyqBlobs) {
    const parts = item.path.split('/');
    const fileName = parts.pop();
    const subjectFolder = parts.join('/');
    const expectedGeuPath = `${subjectFolder}/PYQ/${fileName}`;
    expected[expectedGeuPath] = { source: `PYQ: ${item.path}`, found: false };
  }

  // Map Notes files
  for (const item of notesBlobs) {
    const parts = item.path.split('/');
    const fileName = parts.pop();
    const subjectFolder = parts.join('/');
    const expectedGeuPath = `${subjectFolder}/Notes/${fileName}`;
    expected[expectedGeuPath] = { source: `Notes: ${item.path}`, found: false };
  }

  // Map Syllabus files
  for (const item of syllabusBlobs) {
    const parts = item.path.split('/');
    const fileName = parts.pop();
    const subjectFolder = parts.join('/');
    // Syllabus structure might be different? Let's assume it maps to Syllabus folder
    const expectedGeuPath = `${subjectFolder}/Syllabus/${fileName}`;
    expected[expectedGeuPath] = { source: `Syllabus: ${item.path}`, found: false };
  }

  // Now check what is actually in GEU
  // Wait, some GEU paths might be slightly different due to folder renaming (e.g. B.Com Hons -> B.Com (Hons))
  // Let's normalize everything for a fair comparison
  const normalize = (p) => p.replace('B.Com Hons', 'B.Com (Hons)').replace('Electronics  Communication (ECE)', 'Electronics & Communication (ECE)').toLowerCase();

  let expectedKeys = Object.keys(expected);
  
  let geuPaths = geuBlobs.map(i => i.path);
  let geuPathsNormalized = geuPaths.map(normalize);

  let missing = [];

  for (const key of expectedKeys) {
    const normKey = normalize(key);
    let index = geuPathsNormalized.indexOf(normKey);
    if (index !== -1) {
      expected[key].found = true;
    } else {
      missing.push({ expected: key, source: expected[key].source });
    }
  }

  // Write report
  let report = `# Audit Report\n\n`;
  report += `Total expected files from old repos: ${expectedKeys.length}\n`;
  report += `Files successfully found in GEU: ${expectedKeys.length - missing.length}\n`;
  report += `Missing files: ${missing.length}\n\n`;

  if (missing.length > 0) {
    report += `## Missing Files\n\n`;
    for (const m of missing) {
      report += `- **Source:** \`${m.source}\`\n  **Expected in GEU:** \`${m.expected}\`\n\n`;
    }
  }

  fs.writeFileSync('audit_report.md', report);
  console.log(`Audit complete. Expected: ${expectedKeys.length}. Missing: ${missing.length}`);
}

run();
