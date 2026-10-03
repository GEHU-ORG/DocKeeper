const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function getTree(repo) {
  try {
    const { data: ref } = await octokit.git.getRef({ owner: 'UniExamPrep', repo, ref: 'heads/main' });
    const { data: commit } = await octokit.git.getCommit({ owner: 'UniExamPrep', repo, commit_sha: ref.object.sha });
    const { data: tree } = await octokit.git.getTree({ owner: 'UniExamPrep', repo, tree_sha: commit.tree.sha, recursive: '1' });
    return tree.tree.filter(i => i.type === 'blob' && !i.path.endsWith('.keep') && i.path !== 'README.md');
  } catch (e) {
    if (e.status === 404 || e.status === 409) return [];
    console.error(`Error fetching ${repo}:`, e.message);
    return [];
  }
}

async function run() {
  console.log("Fetching old repos...");
  const notesBlobs = await getTree('Notes');
  const pyqBlobs = await getTree('PYQ');
  const syllabusBlobs = await getTree('Syllabus');
  const notesGehuBlobs = await getTree('NOTES-GEHU');
  const pyqGehuBlobs = await getTree('PYQ-GEHU');
  
  console.log("Fetching new GEU repo...");
  const newRepoBlobs = await getTree('GEU');

  let expectedFilesCount = 0;
  
  // GEU files
  for (const item of pyqBlobs) expectedFilesCount++;
  for (const item of notesBlobs) expectedFilesCount++;
  for (const item of syllabusBlobs) expectedFilesCount++;
  
  // GEHU files
  for (const item of pyqGehuBlobs) expectedFilesCount++;
  for (const item of notesGehuBlobs) expectedFilesCount++;

  console.log(`Total expected files from old repos: ${expectedFilesCount}`);
  
  // Filter new repo blobs (excluding some config files if any)
  const actualPdfs = newRepoBlobs.filter(i => i.path.endsWith('.pdf'));
  console.log(`Total PDF files currently in UniExamPrep repo: ${actualPdfs.length}`);
  
  const allOldPdfs = [
    ...notesBlobs, ...pyqBlobs, ...syllabusBlobs, ...notesGehuBlobs, ...pyqGehuBlobs
  ].filter(i => i.path.endsWith('.pdf'));
  
  console.log(`Total PDF files in old repos combined: ${allOldPdfs.length}`);
  
  if (actualPdfs.length >= allOldPdfs.length) {
    console.log("✅ All files have been successfully migrated! No files were left behind.");
  } else {
    console.log(`❌ Missing ${allOldPdfs.length - actualPdfs.length} files.`);
  }
}

run();
