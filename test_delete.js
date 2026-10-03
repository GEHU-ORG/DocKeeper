const { Octokit } = require('@octokit/rest');
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function testDelete() {
  try {
    const ORG_NAME = 'UniExamPrep';
    const repo = 'GEU';
    
    // Create a dummy folder and file first
    await octokit.repos.createOrUpdateFileContents({
      owner: ORG_NAME,
      repo,
      path: 'test_delete_folder/test.txt',
      message: 'test',
      content: Buffer.from('test').toString('base64'),
    });
    console.log('Created test file in test_delete_folder');

    // Get latest commit and tree
    const { data: ref } = await octokit.git.getRef({ owner: ORG_NAME, repo, ref: 'heads/main' });
    const latestCommitSha = ref.object.sha;
    const { data: commit } = await octokit.git.getCommit({ owner: ORG_NAME, repo, commit_sha: latestCommitSha });
    const baseTreeSha = commit.tree.sha;

    // Delete folder
    const { data: newTree } = await octokit.git.createTree({
      owner: ORG_NAME,
      repo,
      base_tree: baseTreeSha,
      tree: [
        {
          path: 'test_delete_folder',
          mode: '040000',
          type: 'tree',
          sha: null
        }
      ]
    });

    const { data: newCommit } = await octokit.git.createCommit({
      owner: ORG_NAME,
      repo,
      message: 'Delete test_delete_folder',
      tree: newTree.sha,
      parents: [latestCommitSha]
    });

    await octokit.git.updateRef({ owner: ORG_NAME, repo, ref: 'heads/main', sha: newCommit.sha });
    console.log('Successfully deleted folder via tree manipulation');
  } catch (e) {
    console.error(e);
  }
}

testDelete();
