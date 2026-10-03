const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function run() {
  const owner = 'UniExamPrep';
  const repo = 'GEU';
  
  try {
    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
    const sha = ref.object.sha;
    
    const { data: commit } = await octokit.git.getCommit({ owner, repo, commit_sha: sha });
    
    const { data: tree } = await octokit.git.getTree({ owner, repo, tree_sha: commit.tree.sha, recursive: '1' });

    let count1 = 0;
    let count2 = 0;

    for (const item of tree.tree) {
      if (item.type === 'blob') {
        if (item.path.startsWith('B.Tech/Electronics  Communication (ECE)/')) count1++;
        if (item.path.startsWith('B.Tech/Electronics & Communication (ECE)/')) count2++;
      }
    }

    console.log(`Files in 'Electronics  Communication (ECE)': ${count1}`);
    console.log(`Files in 'Electronics & Communication (ECE)': ${count2}`);
  } catch (e) {
    console.error(e);
  }
}
run();
