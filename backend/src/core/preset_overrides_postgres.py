from typing import Dict
from datetime import datetime
import logging

import psycopg


class PresetOverridesPostgres:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self._init_database()

    def _connect(self):
        return psycopg.connect(self.database_url)

    def _init_database(self) -> None:
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS preset_overrides (
                        id SERIAL PRIMARY KEY,
                        preset_key TEXT UNIQUE NOT NULL,
                        source_path TEXT NOT NULL,
                        target_path TEXT NOT NULL,
                        updated_at TIMESTAMP NOT NULL
                    )
                    """
                )
        logging.info("Preset overrides table initialized (Postgres).")

    def get_all(self) -> Dict[str, Dict[str, str]]:
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT preset_key, source_path, target_path FROM preset_overrides"
                )
                rows = cursor.fetchall()
        return {k: {"source": s, "target": t} for (k, s, t) in rows}

    def upsert(self, preset_key: str, source_path: str, target_path: str) -> None:
        ts = datetime.now().isoformat()
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO preset_overrides (preset_key, source_path, target_path, updated_at)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT(preset_key) DO UPDATE SET
                        source_path = EXCLUDED.source_path,
                        target_path = EXCLUDED.target_path,
                        updated_at = EXCLUDED.updated_at
                    """,
                    (preset_key, source_path, target_path, ts),
                )



