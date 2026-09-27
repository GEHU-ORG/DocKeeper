# DataKeeper

**macOS Finder-inspired cloud file manager built with Next.js and Vercel Blob.**

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

---

## What It Does

A cloud-based personal file manager that replicates the familiar macOS Finder experience in the browser. Upload, organize, and access files from any device with zero-config serverless storage.

**Key Features:**
- **Finder-style UI** — familiar desktop-like browser experience
- **Vercel Blob** — serverless object storage integration
- **Drag & Drop** — intuitive upload with progress indicators
- **File Organization** — folders, filtering, and search functionality

## Architecture

```
Next.js Frontend (Finder UI) ↔ Next.js API Routes ↔ Vercel Blob Storage
```

## Tech Stack

| Component | Technology |
|---|---|
| Framework | Next.js |
| Language | TypeScript |
| Storage | Vercel Blob |
| Deployment | Vercel |

## My Role

I chose Vercel Blob for zero-config deployment, designed the folder hierarchy model, and planned the file management API. Code generation was accelerated using AI tools; Blob SDK integration and responsive layout fine-tuning are mine.

## Quick Start

```bash
git clone https://github.com/AdityaPandey-DEV/DataKeeper.git && cd DataKeeper
npm install
npm run dev   # → http://localhost:3000
```

---

<div align="center">

*Architected & built by [Aditya Pandey](https://github.com/AdityaPandey-DEV) — AI-augmented development*

</div>
