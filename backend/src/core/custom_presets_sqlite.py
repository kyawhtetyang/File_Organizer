import sqlite3
from pathlib import Path
from typing import List, Dict
from datetime import datetime
import logging

class CustomPresetsSQLite:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self._init_database()

    def _init_database(self) -> None:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS custom_presets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                source_path TEXT NOT NULL,
                target_path TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.commit()
        conn.close()
        logging.info(f"Custom presets DB initialized at: {self.db_path}")

    def list_all(self) -> List[Dict]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, source_path, target_path FROM custom_presets ORDER BY id DESC")
        rows = cursor.fetchall()
        conn.close()
        return [
            {"id": row[0], "name": row[1], "source": row[2], "target": row[3]}
            for row in rows
        ]

    def create(self, name: str, source_path: str, target_path: str) -> Dict:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        ts = datetime.now().isoformat()
        cursor.execute(
            "INSERT INTO custom_presets (name, source_path, target_path, created_at) VALUES (?, ?, ?, ?)",
            (name, source_path, target_path, ts)
        )
        conn.commit()
        preset_id = cursor.lastrowid
        conn.close()
        return {"id": preset_id, "name": name, "source": source_path, "target": target_path}

    def delete(self, preset_id: int) -> None:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM custom_presets WHERE id = ?", (preset_id,))
        conn.commit()
        conn.close()




