import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

async function list() {
  const { data } = await octokit.repos.listForOrg({
    org: 'UniExamPrep',
    per_page: 100,
  });
  console.log(data.map(r => r.name).join(', '));
}
list().catch(console.error);
