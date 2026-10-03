const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function countRepoFiles(repo) {
  try {
    const { data: ref } = await octokit.git.getRef({ owner: 'UniExamPrep', repo, ref: 'heads/main' });
    const sha = ref.object.sha;
    
    const { data: commit } = await octokit.git.getCommit({ owner: 'UniExamPrep', repo, commit_sha: sha });
    
    const { data: tree } = await octokit.git.getTree({ owner: 'UniExamPrep', repo, tree_sha: commit.tree.sha, recursive: '1' });

    let count = 0;
    for (const item of tree.tree) {
      if (item.type === 'blob') count++;
    }
    return count;
  } catch (e) {
    if (e.status === 404 || e.status === 409) return 0;
    console.error(`Error counting ${repo}:`, e.message);
    return -1;
  }
}

async function run() {
  const notesCount = await countRepoFiles('Notes');
  const pyqCount = await countRepoFiles('PYQ');
  const syllabusCount = await countRepoFiles('Syllabus');
  const geuCount = await countRepoFiles('GEU');

  console.log('--- File Counts ---');
  console.log(`Notes: ${notesCount}`);
  console.log(`PYQ: ${pyqCount}`);
  console.log(`Syllabus: ${syllabusCount}`);
  console.log(`Sum: ${notesCount + pyqCount + syllabusCount}`);
  console.log(`GEU: ${geuCount}`);
}

run();
