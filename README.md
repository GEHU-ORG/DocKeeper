# GEHU RepoKeeper

A collaborative GitHub repository manager designed specifically for **GEHU-ORG**. 

GEHU RepoKeeper provides a sleek, macOS Finder-inspired user interface for performing CRUD operations directly on GitHub repositories within the GEHU-ORG organization.

## Features
- **Organization-Wide Access**: Connects directly to GEHU-ORG via GitHub API.
- **Visual File Manager**: Browse repositories as if they were local folders.
- **CRUD Operations**: Read, upload, delete, and manage files in any connected repository effortlessly without touching Git commands.
- **Secure Architecture**: Powered by Next.js App Router and `@octokit/rest`.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Vanilla CSS (CSS Modules)
- **API Wrapper**: Octokit (GitHub REST API)
- **Authentication**: NextAuth.js

## Quick Start
1. Clone the repository: `git clone https://github.com/GEHU-ORG/RepoKeeper.git`
2. Install dependencies: `npm install`
3. Setup `.env.local` with your GitHub Personal Access Token (PAT):
   ```env
   GITHUB_PAT=your_classic_or_fine_grained_token
   NEXTAUTH_SECRET=generate_a_secret
   ```
4. Run development server: `npm run dev`

---
*Built to make repository management simple, usable, and aligned with the latest standards.*
