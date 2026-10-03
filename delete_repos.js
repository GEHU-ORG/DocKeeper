const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function run() {
  const reposToDelete = ['Notes', 'PYQ', 'Syllabus', 'NOTES-GEHU', 'PYQ-GEHU'];
  
  for (const repo of reposToDelete) {
    try {
      await octokit.repos.delete({
        owner: 'UniExamPrep',
        repo,
      });
      console.log(`Successfully deleted ${repo}`);
    } catch (e) {
      if (e.status === 404) {
        console.log(`${repo} already deleted or does not exist`);
      } else {
        console.error(`Failed to delete ${repo}:`, e.message);
      }
    }
  }
}

run();
