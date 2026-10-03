const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function run() {
  try {
    const { data: ref } = await octokit.git.getRef({ owner: 'UniExamPrep', repo: 'GEU', ref: 'heads/main' });
    const { data: commit } = await octokit.git.getCommit({ owner: 'UniExamPrep', repo: 'GEU', commit_sha: ref.object.sha });
    const { data: tree } = await octokit.git.getTree({ owner: 'UniExamPrep', repo: 'GEU', tree_sha: commit.tree.sha, recursive: '1' });

    let counts = {};
    for (const item of tree.tree) {
      if (item.type === 'blob') {
        const parts = item.path.split('/');
        const topFolder = parts.length > 1 ? parts[0] + '/' + parts[1] : parts[0];
        counts[topFolder] = (counts[topFolder] || 0) + 1;
      }
    }
    
    // Sort and print
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    for (const [folder, count] of sorted) {
      if (count > 50) console.log(`${folder}: ${count}`);
    }
    console.log(`Total: ${tree.tree.filter(i => i.type === 'blob').length}`);
  } catch (e) {
    console.error(e);
  }
}
run();
