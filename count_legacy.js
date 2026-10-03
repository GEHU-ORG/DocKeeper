const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function countRepoFiles(repo) {
  try {
    const { data: ref } = await octokit.git.getRef({ owner: 'UniExamPrep', repo, ref: 'heads/main' });
    const { data: commit } = await octokit.git.getCommit({ owner: 'UniExamPrep', repo, commit_sha: ref.object.sha });
    const { data: tree } = await octokit.git.getTree({ owner: 'UniExamPrep', repo, tree_sha: commit.tree.sha, recursive: '1' });

    let count = 0;
    for (const item of tree.tree) {
      if (item.type === 'blob') count++;
    }
    return count;
  } catch (e) {
    if (e.status === 404 || e.status === 409) return 0;
    return -1;
  }
}

async function run() {
  console.log(`NOTES-GEHU: ${await countRepoFiles('NOTES-GEHU')}`);
  console.log(`PYQ-GEHU: ${await countRepoFiles('PYQ-GEHU')}`);
}

run();
