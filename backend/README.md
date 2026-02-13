# Backend (File Organizer Pro)

FastAPI backend for the File Organizer Pro pipeline.

## Setup
pip install -r requirements.txt

## Run
python server.py

## Tests
From the repo root:
cd tests
python unit_test.py

## Notes
- Logs: `backend/logs/client_errors.log`
- SQLite databases (default local dev): `backend/undo_history.db`, `backend/preset_overrides.db`
- Postgres (recommended for production): set `DATABASE_URL` (e.g., `postgresql://user:pass@host:5432/dbname`)




