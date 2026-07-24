# Installing NOVA_X

NOVA_X is engineered for rapid deployment. The recommended approach for both development and production is using Docker Compose.

## Prerequisites
- [Docker](https://www.docker.com/products/docker-desktop/) installed and running.
- (Optional) NVIDIA GPU drivers if running Ollama natively for accelerated LLM inference.

---

## 1. Quick Start (Docker Profiles)

We use Docker Compose **profiles** to let you run exactly what you need without altering the compose file.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/USER/NOVA_X.git
   cd NOVA_X
   ```

2. **Setup Environment Variables**:
   ```bash
   cp .env.example .env
   ```

3. **Choose Your Profile**:

   - **Core (Recommended for most)**: Runs the Backend, Frontend, and PostgreSQL.
     ```bash
     docker compose --profile core up -d
     ```
   - **Full**: Runs Core + a local Ollama container.
     ```bash
     docker compose --profile full up -d
     ```
   - **AI Only**: Runs just Ollama if you want to run the backend natively on your machine.
     ```bash
     docker compose --profile ai up -d
     ```

4. **Access the Dashboard**:
   Open `http://localhost:80` in your browser.

---

## 2. Local Native Development (Without Docker)

If you need hot-reloading for contributing to the core engines:

**Backend Setup (Python 3.10+)**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
uvicorn backend.main:app --reload
```

**Frontend Setup (Node 20)**:
```bash
cd frontend
npm install
npm run dev
```

## Troubleshooting
- **Playwright errors in Docker**: Ensure the backend Docker container finishes installing `playwright install-deps` during the build phase.
- **WebSocket Drops**: If running natively, ensure your frontend `.env` points the WS URL to `ws://localhost:8000/api/browser/ws`.
