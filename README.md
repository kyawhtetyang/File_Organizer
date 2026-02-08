# File Organizer Pro

Automated pipeline to clean, rename, dedupe, and organize files with presets and undo support.

## Features
- Multi‑step pipeline: Standardize → Deduplicate → Filename → Group → Transfer
- Presets for common workflows
- Undo history with SQLite
- Local path validation and quick fixes
- Config persistence in local storage
- Client error logging

## Tech Stack
- Frontend: React + Vite
- Backend: FastAPI (Python)
- Database: SQLite (undo history, preset overrides)

## Project Structure
- `frontend/` — UI and client logic
- `backend/` — API and pipeline steps
- `tests/` — backend tests

## Quick Start (Local)
From the repo root:
```bash
cd backend
python server.py
```

```bash
cd frontend
npm install
npm run dev
```

## Tests
From the repo root:
```bash
cd tests
python unit_test.py
```

```bash
cd frontend
npm run test
```

## Deployment Notes
- Recommended domains:
  - Frontend: `files.kyawhtet.com`
  - Backend: `api.files.kyawhtet.com`
- Use Nginx to serve the frontend build and reverse‑proxy the backend.

## License
Private — all rights reserved.
