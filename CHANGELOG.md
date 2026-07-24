# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.5.1-beta] - 2026-07-24

### Added
- **BrowserDashboard.tsx**: A complete Mission Control layout integrating 8 live data widgets.
- **PlaywrightDriver**: True headless Chromium orchestrator, abandoning previous mock drivers.
- **REST APIs**: Full suite of endpoints for BrowserSession management and telemetry initialization.
- **Dockerization**: Complete `.env.example`, `docker-compose.yml`, and `Dockerfile` architecture utilizing explicit profiles (`core`, `ai`, `full`).
- **CI/CD**: GitHub Actions workflows for Backend/Frontend unit testing and Playwright E2E browser checks.

### Changed
- **BrowserSessionManager**: Stabilized the state-machine transitions and abstracted direct Playwright calls into the `BrowserDriver` interface.
- **EventBus Architecture**: Removed manual DB persistence steps from the engine lifecycle, delegating strictly to the EventBus mapping.

### Security
- **WebSocket Auth**: Replaced fake token stubs with rigorous `decode_token` checks from `backend.security.auth`.
- **Quality Checks**: Enforced `pip-audit` and `npm audit` on every PR.

## [v0.1.0] - Initial Commit
- Bootstrapped FastAPI and React application.
