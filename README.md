# NOVA_X

[![Backend CI](https://github.com/USER/NOVA_X/actions/workflows/backend.yml/badge.svg)](https://github.com/USER/NOVA_X/actions/workflows/backend.yml)
[![Frontend CI](https://github.com/USER/NOVA_X/actions/workflows/frontend.yml/badge.svg)](https://github.com/USER/NOVA_X/actions/workflows/frontend.yml)
[![Code Quality & Security](https://github.com/USER/NOVA_X/actions/workflows/quality.yml/badge.svg)](https://github.com/USER/NOVA_X/actions/workflows/quality.yml)
[![Python Version](https://img.shields.io/badge/python-3.10-blue.svg)](https://www.python.org/downloads/release/python-3100/)
[![Node.js Version](https://img.shields.io/badge/node-20.x-green.svg)](https://nodejs.org/en/about/previous-releases)

**NOVA_X** is an advanced Autonomous Agent Platform capable of localized Web Browsing, Desktop Automation, Neural Memory Management, and Voice Integration.

## Mission Statement
Our goal is to provide a fully decentralized, privacy-focused orchestration engine that allows Large Language Models (like Llama 3 via Ollama) to operate on a user's machine autonomously.

## Key Features
- **Browser Engine**: A headless Chromium orchestrator powered by Playwright for autonomous research and interaction.
- **Desktop Engine**: Safely interfaces with OS-level APIs for terminal usage, clipboard manipulation, and UI automation.
- **Neural Memory**: A localized RAG memory store using ChromaDB, allowing the agent to continuously learn user preferences over time.
- **Voice Engine**: Real-time TTS/STT pipelines for conversational interactions.
- **Mission Control**: A React-powered Glassmorphic Dashboard displaying real-time telemetry over WebSockets.

## Architecture Overview
NOVA_X relies on a multi-service architecture:
- **Frontend**: React (Vite) + TypeScript + Tailwind CSS.
- **Backend**: FastAPI + Python 3.10 + SQLAlchemy.
- **Database**: PostgreSQL (Relational) + ChromaDB (Vector).
- **Messaging**: Centralized Python EventBus mapped directly to WebSockets.

Read more in [ARCHITECTURE.md](ARCHITECTURE.md).

## Screenshots
> *(Placeholders for UI Screenshots)*
> - `![Dashboard](docs/assets/dashboard.png)`
> - `![Browser Manager](docs/assets/browser.png)`
> - `![Knowledge Graph](docs/assets/knowledge_graph.png)`

## Installation & Deployment
NOVA_X is fully containerized. Please refer to our documentation for setup guides:
- **[INSTALL.md](INSTALL.md)** - Docker compose profiles and local development setup.
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deploying to VPS, Vercel, and Render.

## API Documentation
See **[API.md](API.md)** for a complete reference on available REST and WebSocket endpoints.

## Contributing
We welcome all PRs! Read **[CONTRIBUTING.md](CONTRIBUTING.md)** for branch strategies, linting standards, and commit conventions.

## License
MIT License. See `LICENSE` for more information.