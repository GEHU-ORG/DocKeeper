# 📦 GEHU DocKeeper

> The central hub for all GEHU student resources, providing a sleek, macOS Finder-inspired user interface for securely accessing syllabus documents, notes, and previous year question papers.

[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Build](https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-orange?style=flat-square)]()

---

## 📋 Overview

**GEHU DocKeeper** is a collaborative document manager designed specifically for **GEHU-ORG**. It provides an incredibly intuitive, file-system-like experience directly in the browser, making it effortless for students to browse and access hundreds of gigabytes of study materials.

Instead of navigating clunky, traditional web interfaces, DocKeeper connects directly to the GitHub API, pulling resources from our managed organization repositories (Syllabus, Notes, and PYQs) and presenting them as interactive folders.

### ✨ Key Features

- **Organization-Wide Access** — Connects directly to GEHU-ORG via the GitHub API to dynamically render study materials.
- **Visual File Manager** — Browse documents, PDFs, and files exactly as if they were local folders on a desktop.
- **Ownership-Based Permissions** — Secure architecture ensures anyone can read documents, but only authorized contributors can modify or delete.
- **Mobile Optimized** — Designed from the ground up to be responsive and accessible on any device.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Language** | `TypeScript` |
| **Framework** | `Next.js 15 (App Router)` |
| **Styling** | `Vanilla CSS (CSS Modules)` |
| **API Wrapper** | `Octokit (GitHub REST API)` |
| **Authentication** | `NextAuth.js` |
| **Infrastructure** | `Vercel` |

---

## 🏗️ Architecture & Development Methodology

### System Architecture

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

### Development Methodology

This project was built using an **AI-augmented development workflow** — a methodology I use across all of my production systems.

**What this means in practice:**

- **Architecture & design are entirely mine.** I defined the system architecture, designed the data models, selected the technology stack, planned the module boundaries, and made every critical engineering decision — from storage engine internals to API contract design.

- **Code generation was accelerated with LLMs.** The implementation of individual modules, boilerplate, and integration code was generated using advanced AI tools (Claude, Gemini, AntiGravity). Each generated output was reviewed, tested, and iteratively refined to meet my architectural specifications.

- **Integration, debugging, and system-level reasoning are human-driven.** Connecting the pieces — resolving cross-module interactions, debugging edge cases, performance tuning, and ensuring the system works cohesively as a whole — was done by me through careful architectural oversight.

**Why this approach?**

This is how modern software is increasingly being built at the highest levels. The value of a systems engineer lies not in typing syntax, but in **knowing what to build, why to build it, and how the pieces fit together**. AI handles the translation from architecture to code. I handle everything else.

> *The result is production-grade software delivered at a pace that would be impossible through traditional manual development — without sacrificing architectural integrity.*

---

## 🚀 Getting Started

### Prerequisites

- `Node.js >= 18`
- `npm` or `yarn`

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

## 🤝 Contributing

Contributions are always welcome! Since this is a community project for GEHU students, we encourage you to help out:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Architected & built by [Aditya Pandey](https://github.com/AdityaPandey-DEV)**

*AI-augmented development · System architecture · Rapid production delivery*

</div>
