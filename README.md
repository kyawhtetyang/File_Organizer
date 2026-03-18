# File Organizer Pro

File Organizer Pro is a local desktop app that safely standardizes, deduplicates, renames, groups, and transfers files with full previews and undo support. It combines a Python FastAPI backend with a Tauri desktop UI so users can audit each pipeline step before any files are changed.

## Pitch (1 line)
Local, undo-safe file organization with step-by-step previews that makes bulk cleanup predictable instead of risky.

## Pipeline
`Standardize -> Deduplicate -> Filename -> Group -> Transfer`

## Key Features
- Step-based processing with per-step previews and results
- Deduplicate modes: `safe` and `smart`
- Presets with per-preset source and target overrides
- Undo history (SQLite by default; Postgres optional via `DATABASE_URL`)
- Tauri desktop support (frontend + backend sidecar)

## Tech Stack
- Backend: Python, FastAPI
- Frontend: React, Vite
- Desktop: Tauri
- Storage: SQLite (default), Postgres (optional)

## Architecture
- `backend/` hosts the pipeline engine, step logic, and undo manager
- `frontend/` provides the step builder, preview UI, and results view
- `landing/` is the marketing site and product overview

## Repository Structure
- `frontend/` React + Vite UI
- `backend/` FastAPI backend and pipeline steps
- `tests/` backend/unit integration tests
- `landing/` marketing/landing web app

## Quickstart (Local Development)
From the repository root (`v0/`):

```bash
# backend
python backend/server.py

# frontend
npm --prefix frontend install
npm --prefix frontend run dev

# landing
npm --prefix landing install
npm --prefix landing run dev
```

Optional one-command launcher:
```bash
./__install/start_file_organizer.sh
```

## Test Commands
From the repository root (`v0/`):

```bash
PYTHONPATH=. pytest -q
npm --prefix frontend run test
```

## Build
```bash
npm --prefix frontend run build
```

## Results / Impact
- Reduces the risk of irreversible bulk file operations by requiring step previews and providing undo history.
- Makes large cleanups repeatable through presets and per-step configuration instead of one-off scripts.
- Keeps processing local-first, avoiding privacy tradeoffs of cloud-based organizers.

## Demo
![Setup Page](docs/2.%20Setup%20Page.png)
![Preview Page](docs/3.%20Preview%20Page.png)
![Summary Page](docs/4.%20Summary%20Page.png)
