const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function run() {
  try {
    const { data: ref } = await octokit.git.getRef({ owner: 'UniExamPrep', repo: 'GEU', ref: 'heads/main' });
    const { data: commit } = await octokit.git.getCommit({ owner: 'UniExamPrep', repo: 'GEU', commit_sha: ref.object.sha });
    const { data: tree } = await octokit.git.getTree({ owner: 'UniExamPrep', repo: 'GEU', tree_sha: commit.tree.sha, recursive: '1' });

    let treeMap = new Map();
    let blobPaths = new Set();
    let fileTree = [];

    for (const item of tree.tree) {
      if (item.type === 'blob') {
        blobPaths.add(item.path);
        fileTree.push(item.path);
      }
    }

    // Find all folders
    let allFolders = new Set();
    for (const item of tree.tree) {
      if (item.type === 'tree') {
        allFolders.add(item.path);
      }
    }

    // Find empty folders (folders that have NO blobs underneath them that are not .keep)
    let emptyFolders = [];
    for (const folder of allFolders) {
      let hasFiles = false;
      for (const blob of blobPaths) {
        if (blob.startsWith(folder + '/') && !blob.endsWith('.keep')) {
          hasFiles = true;
          break;
        }
      }
      if (!hasFiles) emptyFolders.push(folder);
    }

    // Print some root level weird files that disturb the structure
    let rootFiles = fileTree.filter(p => !p.includes('/'));
    
    console.log('--- Root Files ---');
    console.log(rootFiles);
    
    console.log('\n--- First 20 Empty Folders ---');
    console.log(emptyFolders.sort().slice(0, 20));

    // Look for weird structures like a folder that should be inside another
    console.log('\n--- Top Level Folders ---');
    let topFolders = new Set(fileTree.map(p => p.split('/')[0]));
    console.log(Array.from(topFolders));

  } catch (e) {
    console.error(e);
  }
}
run();
