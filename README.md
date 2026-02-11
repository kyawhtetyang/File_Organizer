# File Organizer Pro

Automated pipeline to clean, rename, dedupe, and organize files with presets and undo support.

## Screenshots
![Landing Page](docs/1.%20Landing%20Page.png)
![Setup Page](docs/2.%20Setup%20Page.png)
![Preview Page](docs/3.%20Preview%20Page.png)
![Summary Page](docs/4.%20Summary%20Page.png)

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
- `landing/` — public landing page (download the mac app)
- `backend/` — API and pipeline steps
- `tests/` — backend tests

## Quick Start (Local)
From the repo root:
cd backend
python server.py

cd frontend
npm install
npm run dev

cd landing
npm install
npm run dev

## Dev Ports
- `frontend`: `http://localhost:3000`
- `landing`: `http://localhost:3001`
- `backend`: default from `backend/server.py`

## Tests
From the repo root:
cd tests
python unit_test.py

cd frontend
npm run test

## Deployment Notes
- Recommended domains:
  - Frontend: `files.kyawhtet.com`
  - Backend: `api.files.kyawhtet.com`
- Use Nginx to serve the frontend build and reverse‑proxy the backend.

## License
Private — all rights reserved.
