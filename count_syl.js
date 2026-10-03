const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function run() {
  try {
    const { data: ref } = await octokit.git.getRef({ owner: 'UniExamPrep', repo: 'GEU', ref: 'heads/main' });
    const { data: commit } = await octokit.git.getCommit({ owner: 'UniExamPrep', repo: 'GEU', commit_sha: ref.object.sha });
    const { data: tree } = await octokit.git.getTree({ owner: 'UniExamPrep', repo: 'GEU', tree_sha: commit.tree.sha, recursive: '1' });

    let count = 0;
    for (const item of tree.tree) {
      if (item.type === 'blob' && item.path.includes('/Syllabus/')) {
        count++;
      }
    }
    
    console.log(`Total duplicated Syllabus files in GEU: ${count}`);
  } catch (e) {
    console.error(e);
  }
}
run();
