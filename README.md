# File Organizer Pro

Automated local file-processing pipeline with preview, presets, and undo support.

## Pipeline
`Standardize -> Deduplicate -> Filename -> Group -> Transfer`

## Main Features
- Step-based processing with per-step preview/results
- Deduplicate modes: `safe` and `smart`
- Presets and per-preset source/target overrides
- Undo history (`SQLite` in local/dev, Postgres optional)
- Tauri desktop support (frontend + backend sidecar)

## Repository Structure
- `frontend/` React + Vite UI
- `backend/` FastAPI backend and pipeline steps
- `tests/` backend/unit integration tests
- `landing/` marketing/landing web app

## Local Development
From the `v12/` directory:

# backend
python backend/server.py

# frontend
npm --prefix frontend install
npm --prefix frontend run dev

# landing
npm --prefix landing install
npm --prefix landing run dev

## Test Commands
From the `v12/` directory:

python -m pytest tests
npm --prefix frontend run test

## Build
npm --prefix frontend run build

## Screenshots
![Landing Page](docs/1.%20Landing%20Page.png)
![Setup Page](docs/2.%20Setup%20Page.png)
![Preview Page](docs/3.%20Preview%20Page.png)
![Summary Page](docs/4.%20Summary%20Page.png)
