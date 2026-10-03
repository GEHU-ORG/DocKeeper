const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
const fs = require('fs');

async function getTree(repo) {
  try {
    const { data: ref } = await octokit.git.getRef({ owner: 'UniExamPrep', repo, ref: 'heads/main' });
    const { data: commit } = await octokit.git.getCommit({ owner: 'UniExamPrep', repo, commit_sha: ref.object.sha });
    const { data: tree } = await octokit.git.getTree({ owner: 'UniExamPrep', repo, tree_sha: commit.tree.sha, recursive: '1' });
    return tree.tree.filter(i => i.type === 'blob' && !i.path.endsWith('.keep') && !i.path.endsWith('README.md') && !i.path.includes('.git'));
  } catch (e) {
    if (e.status === 404 || e.status === 409) return [];
    console.error(`Error fetching ${repo}:`, e.message);
    return [];
  }
}

async function run() {
  const geuBlobs = await getTree('GEU');
  const geuShas = new Set(geuBlobs.map(i => i.sha));

  const oldRepos = ['Notes', 'PYQ', 'Syllabus'];
  let missingFiles = [];

  for (const repo of oldRepos) {
    const blobs = await getTree(repo);
    for (const item of blobs) {
      if (!geuShas.has(item.sha)) {
        missingFiles.push({ repo, path: item.path, sha: item.sha });
      }
    }
  }

  let report = `# Data Integrity Audit\n\n`;
  report += `This audit checks if the exact file content (SHA) from the old repositories exists ANYWHERE in the new GEU repository.\n\n`;
  report += `Total Missing Files: ${missingFiles.length}\n\n`;

  if (missingFiles.length > 0) {
    for (const m of missingFiles) {
      report += `- **${m.repo}**: \`${m.path}\`\n`;
    }
  }

  fs.writeFileSync('integrity_report.md', report);
  console.log(`Audit complete. Missing files: ${missingFiles.length}`);
}

run();
