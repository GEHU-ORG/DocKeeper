const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

function mapPath(oldPath, repoType) {
  let p = oldPath.replace(/\\/g, '/');
  if (p === 'Docs/index.md') return 'Docs/index.md';
  if (p.endsWith('index.md') && p.split('/').length === 2) return null;

  let parts = p.split('/');
  let dept = parts[0].toLowerCase();
  
  let newDept = dept;
  if (dept === 'btech') newDept = 'B.Tech/General';
  else if (dept === 'mca') newDept = 'MCA/General';
  else if (dept === 'bca') newDept = 'BCA/General';
  else return null;

  if (parts.length > 1 && parts[1].toUpperCase() === 'CSE') {
    newDept = 'B.Tech/Computer Science Engineering (CSE)';
    parts.splice(1, 1);
  }

  let rest = parts.slice(1);
  if (rest.length < 2) return null;

  let semester = rest[0];
  if (semester.toLowerCase().startsWith('sem ')) semester = semester.toLowerCase().replace('sem ', 'Semester-');
  else if (semester.toLowerCase() === 'year 1') semester = 'Year-1';
  else if (semester.toLowerCase() === 'projects') semester = 'Projects';

  let subject = rest[1];
  let fileName = rest.pop();

  if (semester === 'Projects') {
    let projPath = rest.slice(1).join('/');
    return `${newDept}/${semester}/${projPath}/${fileName}`;
  }

  if (semester === 'Year-1' && subject === 'common') {
    if (rest.length > 2) {
      subject = rest[2];
      let fileRest = rest.slice(3).join('/');
      if (fileRest) fileName = fileRest + '/' + fileName;
    } else {
      subject = 'General';
    }
  } else {
    let fileRest = rest.slice(2).join('/');
    if (fileRest) fileName = fileRest + '/' + fileName;
  }

  if (subject) {
    subject = subject.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  } else {
    subject = 'General';
  }

  let typeFolder = repoType === 'PYQ' ? 'PYQ' : (repoType === 'Notes' ? 'Notes' : 'Syllabus');
  let finalPath = `${newDept}/${semester}/${subject}/${typeFolder}/${fileName}`;
  return finalPath.replace(/\/\//g, '/').replace(/^\//, '');
}

async function getTree(repo) {
  try {
    const { data: ref } = await octokit.git.getRef({ owner: 'UniExamPrep', repo, ref: 'heads/main' });
    const { data: commit } = await octokit.git.getCommit({ owner: 'UniExamPrep', repo, commit_sha: ref.object.sha });
    const { data: tree } = await octokit.git.getTree({ owner: 'UniExamPrep', repo, tree_sha: commit.tree.sha, recursive: '1' });
    return tree.tree.filter(i => i.type === 'blob' && !i.path.endsWith('.keep') && !i.path.endsWith('README.md') && !i.path.includes('.git'));
  } catch (e) {
    return [];
  }
}

async function run() {
  const mode = process.argv[2] || 'core'; // 'core' or 'projects'
  console.log(`Starting Incremental API-based migration for ${mode} files...`);

  const geuBlobs = await getTree('GEU');
  const geuShas = new Set(geuBlobs.map(i => i.sha));
  
  const oldRepos = ['Notes', 'PYQ', 'Syllabus'];
  let filesToMigrate = [];
  
  for (const repo of oldRepos) {
    const blobs = await getTree(repo);
    for (const item of blobs) {
      if (!geuShas.has(item.sha)) {
        let newPath = mapPath(item.path, repo);
        if (newPath && !newPath.includes('.git/') && !newPath.includes('//')) {
          const isProject = newPath.includes('/Projects/');
          if ((mode === 'core' && !isProject) || (mode === 'projects' && isProject)) {
            filesToMigrate.push({ repo, oldSha: item.sha, oldPath: item.path, newPath });
          }
        }
      }
    }
  }

  console.log(`Found ${filesToMigrate.length} missing ${mode} files to migrate.`);
  if (filesToMigrate.length === 0) return;

  const { data: ref } = await octokit.git.getRef({ owner: 'UniExamPrep', repo: 'GEU', ref: 'heads/main' });
  const { data: commit } = await octokit.git.getCommit({ owner: 'UniExamPrep', repo: 'GEU', commit_sha: ref.object.sha });
  let currentBaseTreeSha = commit.tree.sha;

  // Process in chunks of 40 to avoid tree size timeouts
  const chunkSize = 40;
  let count = 0;

  for (let i = 0; i < filesToMigrate.length; i += chunkSize) {
    const chunk = filesToMigrate.slice(i, i + chunkSize);
    let treeUpdates = [];

    for (const item of chunk) {
      try {
        const { data: blobData } = await octokit.git.getBlob({ owner: 'UniExamPrep', repo: item.repo, file_sha: item.oldSha });
        const { data: newBlob } = await octokit.git.createBlob({ owner: 'UniExamPrep', repo: 'GEU', content: blobData.content, encoding: blobData.encoding });
        treeUpdates.push({ path: item.newPath, mode: '100644', type: 'blob', sha: newBlob.sha });
        count++;
        console.log(`Prepared ${count}/${filesToMigrate.length} files...`);
      } catch (e) {
        console.error(`Failed to process ${item.oldPath}:`, e.message);
      }
    }

    if (treeUpdates.length > 0) {
      console.log(`Submitting incremental tree update for chunk...`);
      const { data: newTree } = await octokit.git.createTree({ owner: 'UniExamPrep', repo: 'GEU', base_tree: currentBaseTreeSha, tree: treeUpdates });
      currentBaseTreeSha = newTree.sha; // Update base tree for next chunk
    }
  }

  console.log('All incremental trees built. Committing final tree...');
  const { data: newCommit } = await octokit.git.createCommit({ owner: 'UniExamPrep', repo: 'GEU', message: `Restore missing ${mode} files incrementally`, tree: currentBaseTreeSha, parents: [ref.object.sha] });
  await octokit.git.updateRef({ owner: 'UniExamPrep', repo: 'GEU', ref: 'heads/main', sha: newCommit.sha });

  console.log(`Successfully restored ${mode} files!`);
}
run();
