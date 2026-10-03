const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function run() {
  const owner = 'UniExamPrep';
  const repo = 'GEU';
  const sha = '383c88944e06186d4a96aceb9b426f7168eb0959';

  try {
    console.log(`Updating ${owner}/${repo} to commit ${sha}...`);
    await octokit.git.updateRef({
      owner,
      repo,
      ref: 'heads/main',
      sha,
      force: true,
    });
    console.log('Successfully reverted main branch.');

    const { data: commit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: sha
    });

    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: commit.tree.sha,
      recursive: '1'
    });

    console.log('\n--- Checking for B.Tech departments ---');
    const btechPaths = tree.tree.filter(item => item.path.startsWith('B.Tech/') && item.type === 'tree' && item.path.split('/').length === 2);
    
    for (const item of btechPaths) {
      console.log(item.path);
    }
  } catch (err) {
    console.error(err);
  }
}

run();
