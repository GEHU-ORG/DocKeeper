const { execSync } = require('child_process');

const advancedIssues = [
  { title: '[Architecture] Migrate database queries to Prisma Accelerate', body: 'As we scale, raw Neon Postgres connections might hit limits. We need to implement Prisma Accelerate (connection pooling and global caching) to reduce latency on heavy reads.', labels: 'backend, architecture, help wanted' },
  { title: '[Feature] Implement Full-Text Search across PDF contents using pgvector', body: 'Currently, users can only search by file name. We want to extract text from all PDFs, generate embeddings using Gemini, store them in Neon with `pgvector`, and enable semantic search.', labels: 'backend, AI, database, help wanted' },
  { title: '[Feature] Real-time Collaborative Note Editing (WebSockets)', body: 'When an AI generates a note, multiple users should be able to edit the markdown simultaneously. Implement WebSockets (e.g., Socket.io or Pusher) and Yjs for CRDT-based collaborative editing.', labels: 'fullstack, realtime, help wanted' },
  { title: '[DevOps] Dockerize the application for self-hosting', body: 'Provide a `Dockerfile` and `docker-compose.yml` so that other universities can easily self-host DocKeeper on their own infrastructure (including a local Postgres container).', labels: 'devops, enhancement' },
  { title: '[Backend] Add Background Job Queue (Redis/BullMQ)', body: 'Generating huge 1-Pagers can sometimes hit 10s+ timeouts on Vercel. We need to move AI generation to a background worker queue using Redis and BullMQ, and poll for the result.', labels: 'backend, performance, help wanted' },
  { title: '[Feature] OAuth2 Provider: "Login with DocKeeper"', body: 'Allow other student-built applications on campus to authenticate users via our platform. Implement an OAuth2 provider flow in Next.js.', labels: 'security, backend, help wanted' },
  { title: '[Tooling] Create a CLI tool for bulk PDF uploading', body: 'Build a separate Node.js CLI package (`dockeeper-cli`) that allows admins to bulk upload entire directory structures of PDFs directly to the GitHub repository via the Octokit API.', labels: 'tooling, backend' },
  { title: '[Feature] Implement Admin Dashboard and RBAC', body: 'We currently lack Role-Based Access Control. Add an `Admin` role to the Prisma User model and build a protected `/admin` route to view total users, API token usage, and manage files.', labels: 'fullstack, security, help wanted' },
  { title: '[Performance] Implement Edge Caching with Upstash Redis', body: 'Certain heavily requested syllabus data and PYQ answers should be cached at the Edge. Implement Upstash Redis to cache these responses and invalidate them via webhooks.', labels: 'performance, backend' },
  { title: '[AI] Add RAG (Retrieval-Augmented Generation) for accurate answering', body: 'Currently, the AI answers PYQs based on its internal knowledge. We need to build a RAG pipeline that reads the actual PDF text, chunks it, and feeds it into the context window for 100% accurate, source-cited answers.', labels: 'AI, backend, core' },
  { title: '[Security] Implement Rate Limiting via Redis', body: 'To prevent abuse of our API keys, implement IP-based and User-based rate limiting on the `/api/study` routes using Redis.', labels: 'security, backend' },
  { title: '[Data] Automated nightly database backups to S3', body: 'Write a cron job or GitHub Action that dumps the Neon Postgres database and uploads the encrypted `.sql` file to an AWS S3 bucket every night at 2 AM.', labels: 'devops, database' },
  { title: '[Feature] Add "Study Groups" and shared folders', body: 'Allow users to create private "Groups", invite other students via email, and have private shared folders where they can upload specific PDFs only visible to the group.', labels: 'fullstack, core, help wanted' },
  { title: '[Refactor] Migrate from Pages Router API to Next.js 14 Server Actions', body: 'Some of our forms and data mutations still use standard REST `/api` routes. Refactor these to use React Server Actions for better performance and less client-side JavaScript.', labels: 'refactor, frontend, core' },
  { title: '[Testing] Set up Playwright for E2E CI Testing', body: 'Our critical paths (Sign In, Generating a Note, Viewing a PDF) need End-to-End tests. Set up Playwright and integrate it into a GitHub Actions workflow that blocks merging on failure.', labels: 'testing, devops' }
];

console.log(`Starting to create ${advancedIssues.length} advanced issues...`);

for (let i = 0; i < advancedIssues.length; i++) {
  const issue = advancedIssues[i];
  try {
    const title = issue.title.replace(/"/g, '\\"');
    const body = issue.body.replace(/"/g, '\\"');
    const labelArgs = `--label "help wanted" --label "enhancement"`;
    
    const command = `gh issue create --title "${title}" --body "${body}" ${labelArgs}`;
    
    console.log(`Creating issue: ${title}`);
    execSync(command, { stdio: 'ignore' });
    execSync('sleep 2.5');
  } catch (error) {
    console.error(`Failed to create issue: ${issue.title}`);
  }
}

console.log("Successfully created advanced issues!");
