const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function run() {
  try {
    const { data: ref } = await octokit.git.getRef({ owner: 'UniExamPrep', repo: 'GEU', ref: 'heads/main' });
    console.log('Current commit for main branch:', ref.object.sha);
  } catch (e) {
    console.error(e);
  }
}
run();
