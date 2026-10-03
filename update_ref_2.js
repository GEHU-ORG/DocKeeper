const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function run() {
  const owner = 'UniExamPrep';
  const repo = 'GEU';
  const sha = '1992f663fecc22545a3faeffc4c1ac5ed037c66a';

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
  } catch (err) {
    console.error(err);
  }
}

run();
