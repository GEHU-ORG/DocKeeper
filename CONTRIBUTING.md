# Contributing to DocKeeper

First off, thank you for considering contributing to DocKeeper! It's people like you that make this platform a great tool for university students globally.

## How Can I Contribute?

### 1. Reporting Bugs & Requesting Features
If you find a bug or have a feature request, please open an issue on GitHub. Make sure to include:
- A clear and descriptive title
- Steps to reproduce the bug
- What you expected to happen vs what actually happened

### 2. Submitting Code (Pull Requests)
We welcome contributions from students and developers anywhere in the world! 

**Local Development Setup:**
1. Fork the repository and clone it locally.
2. Install dependencies: `npm install`
3. Set up your environment variables (copy `.env.example` to `.env` and add your database URL and Google Gemini API key).
4. Run database migrations: `npx prisma db push`
5. Start the development server: `npm run dev`

**Making a Pull Request:**
1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes and test them locally.
3. Commit your changes with a clear message: `git commit -m "feat: added new dark mode toggle"`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request against our `main` branch.

## Good First Issues
If you're new to open source, check out our issues labeled `good first issue`. These are specifically curated to be easy to tackle!

## Code of Conduct
Please be respectful and welcoming to all contributors. This is an educational project meant to help students learn and grow.
