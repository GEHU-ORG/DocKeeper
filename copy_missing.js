const { Octokit } = require('@octokit/rest');
require('dotenv').config({ path: '.env.local' });
const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

function mapPath(oldPath, repoType) {
  // e.g. btech/Year 1/common/basic electrical engineering/file.pdf -> B.Tech/General/Year-1/Basic Electrical Engineering/PYQ/file.pdf
  let p = oldPath.replace(/\\/g, '/');
  
  if (p === 'Docs/index.md') return 'Docs/index.md';
  if (p.endsWith('index.md') && p.split('/').length === 2) return null; // skip root index files

  let parts = p.split('/');
  let dept = parts[0].toLowerCase();
  
  let newDept = dept;
  if (dept === 'btech') newDept = 'B.Tech/General';
  if (dept === 'mca') newDept = 'MCA/General';
  if (dept === 'bca') newDept = 'BCA/General';

  // Handle btech/CSE
  if (parts.length > 1 && parts[1].toUpperCase() === 'CSE') {
    newDept = 'B.Tech/Computer Science Engineering (CSE)';
    parts.splice(1, 1); // remove CSE
  }

  let rest = parts.slice(1); // skip dept

  let semester = rest[0];
  if (semester.toLowerCase().startsWith('sem ')) {
    semester = semester.toLowerCase().replace('sem ', 'Semester-');
  } else if (semester.toLowerCase() === 'year 1') {
    semester = 'Year-1';
  } else if (semester.toLowerCase() === 'projects') {
    semester = 'Projects';
  }

  let subject = rest[1];
  let fileName = rest.pop();

  if (semester === 'Projects') {
    // Projects/DBMS_Project/file
    let projPath = rest.slice(1).join('/');
    return `${newDept}/${semester}/${projPath}/${fileName}`;
  }

  if (semester === 'Year-1' && subject === 'common') {
    subject = rest[2];
    let fileRest = rest.slice(3).join('/');
    if (fileRest) fileName = fileRest + '/' + fileName;
  } else {
    let fileRest = rest.slice(2).join('/');
    if (fileRest) fileName = fileRest + '/' + fileName;
  }

  // Capitalize Subject
  if (subject) {
    subject = subject.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  } else {
    subject = 'General';
  }

  let typeFolder = repoType === 'PYQ' ? 'PYQ' : (repoType === 'Notes' ? 'Notes' : 'Syllabus');
  
  return `${newDept}/${semester}/${subject}/${typeFolder}/${fileName}`;
}

async function getTree(repo) {
  try {
    const { data: ref } = await octokit.git.getRef({ owner: 'UniExamPrep', repo, ref: 'heads/main' });
    const { data: commit } = await octokit.git.getCommit({ owner: 'UniExamPrep', repo, commit_sha: ref.object.sha });
    const { data: tree } = await octokit.git.getTree({ owner: 'UniExamPrep', repo, tree_sha: commit.tree.sha, recursive: '1' });
    return tree.tree.filter(i => i.type === 'blob' && !i.path.endsWith('.keep') && !i.path.endsWith('README.md') && !i.path.includes('.git'));
  } catch (e) {
    if (e.status === 404) return [];
    return [];
  }
}

async function run() {
  const geuBlobs = await getTree('GEU');
  const geuShas = new Set(geuBlobs.map(i => i.sha));
  
  const oldRepos = ['Notes', 'PYQ', 'Syllabus'];
  let treeUpdates = [];
  
  for (const repo of oldRepos) {
    const blobs = await getTree(repo);
    for (const item of blobs) {
      if (!geuShas.has(item.sha)) {
        let newPath = mapPath(item.path, repo);
        if (newPath) {
          treeUpdates.push({ path: newPath, mode: '100644', type: 'blob', sha: item.sha });
        }
      }
    }
  }

  console.log(`Found ${treeUpdates.length} missing files to insert into GEU.`);

  if (treeUpdates.length === 0) return;

  const { data: ref } = await octokit.git.getRef({ owner: 'UniExamPrep', repo: 'GEU', ref: 'heads/main' });
  const { data: commit } = await octokit.git.getCommit({ owner: 'UniExamPrep', repo: 'GEU', commit_sha: ref.object.sha });
  
  const { data: newTree } = await octokit.git.createTree({ owner: 'UniExamPrep', repo: 'GEU', base_tree: commit.tree.sha, tree: treeUpdates });
  const { data: newCommit } = await octokit.git.createCommit({ owner: 'UniExamPrep', repo: 'GEU', message: 'Restore missing files from legacy repos (Projects, Year 1, etc)', tree: newTree.sha, parents: [ref.object.sha] });
  await octokit.git.updateRef({ owner: 'UniExamPrep', repo: 'GEU', ref: 'heads/main', sha: newCommit.sha });

  console.log('Successfully recovered missing files into GEU!');
}
run();
