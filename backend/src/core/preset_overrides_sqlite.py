import sqlite3
from pathlib import Path
from typing import Dict
from datetime import datetime
import logging

class PresetOverridesSQLite:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self._init_database()

    def _init_database(self) -> None:
        self._ensure_valid_db_file()
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS preset_overrides (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                preset_key TEXT UNIQUE NOT NULL,
                source_path TEXT NOT NULL,
                target_path TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.commit()
        conn.close()
        logging.info(f"Preset overrides DB initialized at: {self.db_path}")

    def _ensure_valid_db_file(self) -> None:
        if not self.db_path.exists():
            return
        try:
            size = self.db_path.stat().st_size
            if size == 0:
                self.db_path.unlink()
                return
            with self.db_path.open("rb") as f:
                header = f.read(16)
            if not header.startswith(b"SQLite format 3"):
                backup = self.db_path.with_suffix(self.db_path.suffix + ".bak")
                self.db_path.replace(backup)
                logging.warning(
                    f"Invalid SQLite DB header at {self.db_path}. "
                    f"Backed up to {backup} and will recreate."
                )
        except Exception as e:
            logging.warning(f"Failed to validate DB file {self.db_path}: {e}")

    def get_all(self) -> Dict[str, Dict[str, str]]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT preset_key, source_path, target_path FROM preset_overrides")
        rows = cursor.fetchall()
        conn.close()
        return {k: {"source": s, "target": t} for (k, s, t) in rows}

    def upsert(self, preset_key: str, source_path: str, target_path: str) -> None:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        ts = datetime.now().isoformat()
        cursor.execute(
            """
            INSERT INTO preset_overrides (preset_key, source_path, target_path, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(preset_key) DO UPDATE SET
                source_path=excluded.source_path,
                target_path=excluded.target_path,
                updated_at=excluded.updated_at
            """,
            (preset_key, source_path, target_path, ts)
        )
        conn.commit()
        conn.close()





