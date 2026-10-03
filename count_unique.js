const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function run() {
  try {
    const { data: ref } = await octokit.git.getRef({ owner: 'UniExamPrep', repo: 'GEU', ref: 'heads/main' });
    const { data: commit } = await octokit.git.getCommit({ owner: 'UniExamPrep', repo: 'GEU', commit_sha: ref.object.sha });
    const { data: tree } = await octokit.git.getTree({ owner: 'UniExamPrep', repo: 'GEU', tree_sha: commit.tree.sha, recursive: '1' });

    let uniqueShas = new Set();
    let totalBlobs = 0;
    for (const item of tree.tree) {
      if (item.type === 'blob') {
        totalBlobs++;
        uniqueShas.add(item.sha);
      }
    }
    
    console.log(`Total blobs: ${totalBlobs}`);
    console.log(`Unique files (by content): ${uniqueShas.size}`);
  } catch (e) {
    console.error(e);
  }
}
run();
