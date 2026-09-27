# 📦 GEHU DocKeeper

> A high-performance, centralized platform for GEHU students to securely browse, access, and manage gigabytes of academic resources through a sleek, Finder-inspired user interface.

[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript)]()

---

## 📋 Project Overview

**GEHU DocKeeper** solves a massive data fragmentation problem for students. By aggregating hundreds of gigabytes of syllabi, notes, and previous year question papers scattered across multiple repositories, it provides a centralized, unified document management system directly in the browser. 

Instead of traditional clunky web portals, DocKeeper connects directly to the GitHub API, dynamically rendering repositories as interactive, desktop-like folders. 

### 🚀 Key Technical Highlights

- **Live GitHub API Integration:** Fetches and structures deeply nested repository trees (containing 10,000+ files) in real-time using Octokit.
- **Zero-Trust Security & Permissions:** Leverages NextAuth.js to verify identities. Anyone can read materials, but upload/delete actions are cryptographically verified against the user's GitHub permissions.
- **Optimized Caching & State Management:** Minimizes rate-limiting and delivers instantaneous folder navigation through intelligent caching of API responses.
- **Mobile-First Responsive UI:** Custom CSS Modules architected to deliver a flawless experience across desktop and mobile devices.

---

## 🛠️ Tech Stack & Architecture

| Category | Technologies |
|---|---|
| **Frontend Framework** | Next.js 15 (App Router), React |
| **Language** | TypeScript |
| **Styling** | Vanilla CSS (CSS Modules) |
| **Backend & APIs** | Octokit (GitHub REST API) |
| **Authentication** | NextAuth.js (OAuth) |
| **Deployment** | Vercel |

### System Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Client     │────▶│   API Layer  │────▶│  GitHub API      │
│  (Next.js)   │◀────│  (Octokit)   │◀────│  (GEHU-ORG Data) │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │
                    ┌──────┴──────┐
                    │  NextAuth    │
                    │ (Security)   │
                    └─────────────┘
```

---

## 💻 Technical Challenges & Solutions

To deliver a seamless experience for gigabytes of study materials, this project tackled several complex engineering challenges:

1. **Large-Scale Data Traversal:** Parsing raw GitHub trees containing gigabytes of PDFs required building a resilient data-fetching layer that could recursively traverse directories without blocking the main thread.
2. **API Rate Limiting:** Designed a smart caching mechanism that reduces redundant network requests, keeping the application well under GitHub's strict API rate limits while ensuring data remains fresh.
3. **Performance Optimization:** Utilized Next.js Server Components and advanced routing to ensure the initial load is incredibly fast, achieving optimal Core Web Vitals despite the massive dataset.

This project demonstrates strong capabilities in **full-stack development, API integration, state management, and delivering business value through clean UI/UX.**

---

## 🚀 Getting Started

### Prerequisites

- `Node.js >= 18`
- GitHub OAuth Application Credentials

### Installation

```bash
# Clone the repository
git clone https://github.com/GEHU-ORG/DocKeeper.git
cd DocKeeper

# Install dependencies
npm install
```

### Configuration

Setup `.env.local` with your credentials in the root of the project:

```env
GITHUB_CLIENT_ID=your_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_oauth_app_secret
GITHUB_PAT=your_admin_pat_for_invitations
NEXTAUTH_SECRET=generate_a_secret_key
```

### Running Locally

```bash
# Start the development server
npm run dev
```

Visit `http://localhost:3000` to view the application.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Designed and Developed by [Aditya Pandey](https://github.com/AdityaPandey-DEV)**

*Full-Stack Engineering · Systems Architecture · UI/UX Design*

</div>
