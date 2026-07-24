# Deploying NOVA_X

## Production Infrastructure

NOVA_X is distributed as a set of decoupled containers (`backend`, `frontend`, `postgres`, `ollama`).

### 1. Single Node Deployment (VPS)
If deploying to a single Linux VPS (DigitalOcean, Hetzner, AWS EC2):
1. Install Docker and Docker Compose on the host.
2. Clone the repository.
3. Configure your `.env` with a strong `SECRET_KEY` and production `DATABASE_URL`.
4. Run `docker compose --profile core up -d`
5. Configure an Nginx reverse proxy on the host to route `80` and `443` (SSL via Let's Encrypt) to your frontend container.

### 2. Managed Platforms (PaaS)
**Frontend (Vercel/Netlify):**
- Import the repository.
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: `VITE_API_URL` pointing to your backend URL.

**Backend (Railway/Render):**
- Import the repository.
- Use the `backend/Dockerfile`.
- Provision a managed PostgreSQL instance and inject the `DATABASE_URL`.
- Ensure the platform supports persistent volumes if you rely on the `/app/data` folders for ChromaDB and Logs.

## Persistence
By default, the `docker-compose.yml` mounts 5 isolated volumes:
- `novax_db_data`: PostgreSQL Database files.
- `novax_chroma`: The local ChromaDB vector store.
- `novax_uploads` & `novax_downloads`: Headless browser files.
- `novax_logs`: Observability logs.
- `novax_ollama_data`: Downloaded LLM weights (if using the `ai` profile).

Always ensure these volumes are backed up during infrastructure migrations.
