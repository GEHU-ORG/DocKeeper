const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function run() {
  try {
    const { data: ref } = await octokit.git.getRef({ owner: 'UniExamPrep', repo: 'GEU', ref: 'heads/main' });
    const { data: commit } = await octokit.git.getCommit({ owner: 'UniExamPrep', repo: 'GEU', commit_sha: ref.object.sha });
    const { data: tree } = await octokit.git.getTree({ owner: 'UniExamPrep', repo: 'GEU', tree_sha: commit.tree.sha, recursive: '1' });

    let btechFiles = tree.tree.filter(i => i.type === 'blob' && i.path.startsWith('B.Tech/'));
    
    // Check if any files are missing the typical /Semester-X/Subject/Type structure
    for (const file of btechFiles) {
      if (file.path.endsWith('.keep')) continue;
      const parts = file.path.split('/');
      // Expected: B.Tech / Department / Semester / Subject / Type / File
      if (parts.length < 6) {
        console.log(`Misplaced: ${file.path}`);
      }
    }

    // Check for empty root folders
    let counts = {};
    for (const item of tree.tree) {
      if (item.type === 'blob' && !item.path.endsWith('.keep')) {
        const root = item.path.split('/')[0];
        counts[root] = (counts[root] || 0) + 1;
      }
    }
    
    console.log('\n--- Root Folder Blob Counts ---');
    console.log(counts);

  } catch (e) {
    console.error(e);
  }
}
run();
