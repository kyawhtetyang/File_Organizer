# Backend (File Organizer Pro)

FastAPI backend for the File Organizer Pro pipeline.

## Setup
pip install -r requirements.txt

## Run
python server.py

## Tests
From the repo root:
```bash
cd tests
python unit_test.py
```

## Notes
- Logs: `backend/logs/client_errors.log`
- SQLite databases: `backend/undo_history.db`, `backend/preset_overrides.db`
