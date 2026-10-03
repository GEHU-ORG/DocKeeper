const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function run() {
  try {
    const owner = 'UniExamPrep';
    const repo = 'GEU';

    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
    const latestCommitSha = ref.object.sha;
    
    const { data: commit } = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
    const baseTreeSha = commit.tree.sha;
    
    const { data: tree } = await octokit.git.getTree({ owner, repo, tree_sha: baseTreeSha, recursive: '1' });

    let treeUpdates = [];

    // 1. Move B.Com Hons -> B.Com (Hons)
    for (const item of tree.tree) {
      if (item.type === 'blob') {
        if (item.path.startsWith('B.Com Hons/')) {
          // Delete old
          treeUpdates.push({ path: item.path, mode: '100644', type: 'blob', sha: null });
          // Add new
          const newPath = item.path.replace('B.Com Hons/', 'B.Com (Hons)/');
          treeUpdates.push({ path: newPath, mode: item.mode || '100644', type: 'blob', sha: item.sha });
        }
        
        // 2. Move B.Tech/Electronics  Communication (ECE) -> B.Tech/Electronics & Communication (ECE)
        if (item.path.startsWith('B.Tech/Electronics  Communication (ECE)/')) {
          treeUpdates.push({ path: item.path, mode: '100644', type: 'blob', sha: null });
          const newPath = item.path.replace('B.Tech/Electronics  Communication (ECE)/', 'B.Tech/Electronics & Communication (ECE)/');
          treeUpdates.push({ path: newPath, mode: item.mode || '100644', type: 'blob', sha: item.sha });
        }
      }
    }
    
    // Also delete the old root level tree 'B.Com Hons' and 'B.Tech/Electronics  Communication (ECE)' completely just to be safe
    treeUpdates.push({ path: 'B.Com Hons', mode: '040000', type: 'tree', sha: null });
    treeUpdates.push({ path: 'B.Tech/Electronics  Communication (ECE)', mode: '040000', type: 'tree', sha: null });

    console.log(`Applying ${treeUpdates.length} tree updates...`);

    const { data: newTree } = await octokit.git.createTree({ owner, repo, base_tree: baseTreeSha, tree: treeUpdates });
    const { data: newCommit } = await octokit.git.createCommit({ owner, repo, message: 'Fix structural issues: Merge ECE folders and rename B.Com', tree: newTree.sha, parents: [latestCommitSha] });
    await octokit.git.updateRef({ owner, repo, ref: 'heads/main', sha: newCommit.sha });

    console.log('Structure fixed successfully!');
  } catch (e) {
    console.error(e);
  }
}
run();
