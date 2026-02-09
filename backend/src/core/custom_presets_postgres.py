from typing import List, Dict
from datetime import datetime
import logging

import psycopg


class CustomPresetsPostgres:
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
                    CREATE TABLE IF NOT EXISTS custom_presets (
                        id SERIAL PRIMARY KEY,
                        name TEXT NOT NULL,
                        source_path TEXT NOT NULL,
                        target_path TEXT NOT NULL,
                        created_at TIMESTAMP NOT NULL
                    )
                    """
                )
        logging.info("Custom presets table initialized (Postgres).")

    def list_all(self) -> List[Dict]:
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id, name, source_path, target_path FROM custom_presets ORDER BY id DESC"
                )
                rows = cursor.fetchall()
        return [
            {"id": row[0], "name": row[1], "source": row[2], "target": row[3]}
            for row in rows
        ]

    def create(self, name: str, source_path: str, target_path: str) -> Dict:
        ts = datetime.now().isoformat()
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO custom_presets (name, source_path, target_path, created_at)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (name, source_path, target_path, ts),
                )
                preset_id = cursor.fetchone()[0]
        return {"id": preset_id, "name": name, "source": source_path, "target": target_path}

    def delete(self, preset_id: int) -> None:
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM custom_presets WHERE id = %s", (preset_id,))


