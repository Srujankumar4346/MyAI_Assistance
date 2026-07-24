# Contributing to NOVA_X

First off, thank you for considering contributing to NOVA_X! 

## Branch Strategy
- `main` - Stable, deployable branch. Protected by CI.
- `dev` - Active development branch. All feature branches should merge here.
- `feature/*` - Used for adding new features (e.g. `feature/voice-synthesis`).
- `fix/*` - Used for bug fixes (e.g. `fix/websocket-auth`).

## Coding Standards

### Backend (Python)
We strictly enforce PEP8 through our CI pipeline.
- Format your code: `black backend/`
- Lint your code: `ruff check backend/ --fix`
- Sort your imports: `isort backend/`

### Frontend (React/TypeScript)
We enforce formatting via Prettier and linting via ESLint.
- `npm run lint`
- `npx prettier --write "src/**/*.{ts,tsx}"`

## Pull Request Process
1. Fork the repo and create your branch from `dev`.
2. Write unit tests for your changes.
3. Ensure the test suite passes locally (`pytest` and `vitest`).
4. Push to your fork and submit a Pull Request.
5. A maintainer will review the PR, and if the GitHub Actions CI pipelines pass, it will be merged!

## Commit Conventions
We follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
- `feat: added localized RAG indexing`
- `fix: resolved dangling websocket references`
- `docs: updated INSTALL.md`
- `chore: updated npm dependencies`
