# GEHU DocKeeper

A collaborative document manager designed specifically for **GEHU-ORG**. 

GEHU DocKeeper provides a sleek, macOS Finder-inspired user interface for securely storing, organizing, and accessing documents across the GEHU-ORG organization.

## Features
- **Organization-Wide Access**: Connects directly to GEHU-ORG via GitHub API.
- **Visual File Manager**: Browse documents and files as if they were local folders.
- **Ownership-Based Permissions**: Read all documents, but only modify or delete documents you uploaded.
- **Secure Architecture**: Powered by Next.js App Router, NextAuth (GitHub Provider), and `@octokit/rest`.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Vanilla CSS (CSS Modules)
- **API Wrapper**: Octokit (GitHub REST API)
- **Authentication**: NextAuth.js

## Quick Start
1. Clone the repository: `git clone https://github.com/GEHU-ORG/DocKeeper.git`
2. Install dependencies: `npm install`
3. Setup `.env.local` with your credentials:
   ```env
   GITHUB_CLIENT_ID=your_oauth_app_client_id
   GITHUB_CLIENT_SECRET=your_oauth_app_secret
   GITHUB_PAT=your_admin_pat_for_invitations
   NEXTAUTH_SECRET=generate_a_secret
   ```
4. Run development server: `npm run dev`

---
*Built to make document management simple, usable, and aligned with the latest standards.*
