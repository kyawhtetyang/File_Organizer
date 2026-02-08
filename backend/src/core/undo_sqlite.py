"""
SQLite-based undo system for reversing file operations.
Tracks operations in a database for better performance and querying.
"""

import sqlite3
import shutil
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime
import logging

class UndoManagerSQLite:
    """Manages undo history using SQLite database."""

    def __init__(self, db_path: Path = Path("undo_history.db")):
        self.db_path = db_path
        self.max_history = 10  # Keep last 10 operations
        self._init_database()

    def _init_database(self) -> None:
        """Initialize database schema."""
        self._ensure_valid_db_file()
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create operations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS operations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operation_id TEXT UNIQUE NOT NULL,
                timestamp TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create changes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS changes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operation_id TEXT NOT NULL,
                original_path TEXT NOT NULL,
                new_path TEXT NOT NULL,
                action TEXT NOT NULL,
                FOREIGN KEY (operation_id) REFERENCES operations(operation_id)
            )
        """)

        # Create index for faster queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_operation_id
            ON changes(operation_id)
        """)

        conn.commit()
        conn.close()
        logging.info(f"SQLite database initialized at: {self.db_path}")

    def _ensure_valid_db_file(self) -> None:
        """Ensure the DB file is a valid SQLite database or recreate it."""
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

    def save_operation(self, operation_id: str, changes: List[Dict]) -> None:
        """
        Save an operation to database.

        Args:
            operation_id: Unique identifier for this operation
            changes: List of file changes with original and new paths
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            # Insert operation
            timestamp = datetime.now().isoformat()
            cursor.execute(
                "INSERT INTO operations (operation_id, timestamp) VALUES (?, ?)",
                (operation_id, timestamp)
            )

            # Insert changes
            for change in changes:
                cursor.execute(
                    "INSERT INTO changes (operation_id, original_path, new_path, action) VALUES (?, ?, ?, ?)",
                    (operation_id, change["original"], change["new"], change["action"])
                )

            conn.commit()
            logging.info(f"Saved operation {operation_id} with {len(changes)} changes to SQLite")

            # Cleanup old operations
            self._cleanup_old_operations(cursor)
            conn.commit()

        except sqlite3.IntegrityError as e:
            logging.error(f"Error saving operation (duplicate?): {e}")
            conn.rollback()
        finally:
            conn.close()

    def _cleanup_old_operations(self, cursor: sqlite3.Cursor) -> None:
        """Remove old operations beyond max_history limit."""
        # Get count of operations
        cursor.execute("SELECT COUNT(*) FROM operations")
        count = cursor.fetchone()[0]

        if count > self.max_history:
            # Get IDs of old operations to delete
            cursor.execute("""
                SELECT operation_id FROM operations
                ORDER BY created_at ASC
                LIMIT ?
            """, (count - self.max_history,))

            old_ids = [row[0] for row in cursor.fetchall()]

            # Delete old operations and their changes
            for op_id in old_ids:
                cursor.execute("DELETE FROM changes WHERE operation_id = ?", (op_id,))
                cursor.execute("DELETE FROM operations WHERE operation_id = ?", (op_id,))

            logging.info(f"Cleaned up {len(old_ids)} old operations")

    @staticmethod
    def _cleanup_empty_parents(start_path: Path, max_levels: int = 6) -> None:
        """Remove empty parent directories up to a limited depth."""
        current = start_path
        levels = 0
        while current and levels < max_levels:
            parent = current.parent
            if parent == current:
                break
            try:
                if parent.exists() and not any(parent.iterdir()):
                    parent.rmdir()
                else:
                    break
            except Exception:
                break
            current = parent
            levels += 1

    def undo_last_operation(self) -> Dict:
        """
        Undo the most recent operation.

        Returns:
            Dict with status and details of what was undone
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            # Get last operation
            cursor.execute("""
                SELECT operation_id, timestamp
                FROM operations
                ORDER BY id DESC
                LIMIT 1
            """)

            result = cursor.fetchone()
            if not result:
                return {
                    "success": False,
                    "message": "No operations to undo",
                    "undone_count": 0
                }

            operation_id, timestamp = result

            # Get all changes for this operation
            cursor.execute("""
                SELECT original_path, new_path, action
                FROM changes
                WHERE operation_id = ?
                ORDER BY id DESC
            """, (operation_id,))

            changes = cursor.fetchall()

            undone_count = 0
            failed_count = 0
            errors = []

            # Reverse each change
            for original_path, new_path, action in changes:
                try:
                    original = Path(original_path)
                    new = Path(new_path)

                    if action == "DELETE":
                        # Restore from trash if available
                        if new.exists():
                            original.parent.mkdir(parents=True, exist_ok=True)
                            shutil.move(str(new), str(original))
                            logging.info(f"Restored deleted file: {new} → {original}")
                            undone_count += 1
                        else:
                            logging.warning(f"Cannot undo deletion of {original}")
                            errors.append(f"Cannot restore deleted file: {original.name}")
                            failed_count += 1

                    elif action == "RENAME" or action == "MOVE":
                        # Reverse rename/move: move new back to original
                        if new.exists():
                            # Ensure parent directory exists
                            original.parent.mkdir(parents=True, exist_ok=True)
                            shutil.move(str(new), str(original))
                            logging.info(f"Undone: {new} → {original}")
                            undone_count += 1
                            self._cleanup_empty_parents(new)
                        else:
                            logging.warning(f"File not found for undo: {new}")
                            errors.append(f"File not found: {new.name}")
                            failed_count += 1

                except Exception as e:
                    logging.error(f"Error undoing change: {e}")
                    errors.append(str(e))
                    failed_count += 1

            # Delete the operation from database
            cursor.execute("DELETE FROM changes WHERE operation_id = ?", (operation_id,))
            cursor.execute("DELETE FROM operations WHERE operation_id = ?", (operation_id,))
            conn.commit()

            return {
                "success": undone_count > 0,
                "message": f"Undone {undone_count} changes" + (f", {failed_count} failed" if failed_count > 0 else ""),
                "operation_id": operation_id,
                "undone_count": undone_count,
                "failed_count": failed_count,
                "errors": errors
            }

        finally:
            conn.close()

    def undo_operation(self, operation_id: str, require_latest: bool = True) -> Dict:
        """
        Undo a specific operation. By default, only the latest operation is allowed.
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            if require_latest:
                cursor.execute("SELECT operation_id FROM operations ORDER BY id DESC LIMIT 1")
                latest = cursor.fetchone()
                if not latest or latest[0] != operation_id:
                    return {
                        "success": False,
                        "message": "Only the latest operation can be undone",
                        "undone_count": 0,
                        "failed_count": 0,
                        "errors": []
                    }

            cursor.execute("""
                SELECT original_path, new_path, action
                FROM changes
                WHERE operation_id = ?
                ORDER BY id DESC
            """, (operation_id,))

            changes = cursor.fetchall()
            if not changes:
                return {
                    "success": False,
                    "message": "No changes found for this operation",
                    "undone_count": 0,
                    "failed_count": 0,
                    "errors": []
                }

            undone_count = 0
            failed_count = 0
            errors = []

            for original_path, new_path, action in changes:
                try:
                    original = Path(original_path)
                    new = Path(new_path)

                    if action == "DELETE":
                        if new.exists():
                            original.parent.mkdir(parents=True, exist_ok=True)
                            shutil.move(str(new), str(original))
                            logging.info(f"Restored deleted file: {new} → {original}")
                            undone_count += 1
                            self._cleanup_empty_parents(new)
                        else:
                            logging.warning(f"Cannot undo deletion of {original}")
                            errors.append(f"Cannot restore deleted file: {original.name}")
                            failed_count += 1
                    elif action == "RENAME" or action == "MOVE":
                        if new.exists():
                            original.parent.mkdir(parents=True, exist_ok=True)
                            shutil.move(str(new), str(original))
                            logging.info(f"Undone: {new} → {original}")
                            undone_count += 1
                            self._cleanup_empty_parents(new)
                        else:
                            logging.warning(f"File not found for undo: {new}")
                            errors.append(f"File not found: {new.name}")
                            failed_count += 1

                except Exception as e:
                    logging.error(f"Error undoing change: {e}")
                    errors.append(str(e))
                    failed_count += 1

            cursor.execute("DELETE FROM changes WHERE operation_id = ?", (operation_id,))
            cursor.execute("DELETE FROM operations WHERE operation_id = ?", (operation_id,))
            conn.commit()

            return {
                "success": undone_count > 0,
                "message": f"Undone {undone_count} changes" + (f", {failed_count} failed" if failed_count > 0 else ""),
                "operation_id": operation_id,
                "undone_count": undone_count,
                "failed_count": failed_count,
                "errors": errors
            }

        finally:
            conn.close()

    def get_history(self) -> List[Dict]:
        """Get all operation history."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            # Get all operations
            cursor.execute("""
                SELECT operation_id, timestamp
                FROM operations
                ORDER BY id DESC
            """)

            operations = []
            for operation_id, timestamp in cursor.fetchall():
                # Get changes for this operation
                cursor.execute("""
                    SELECT original_path, new_path, action
                    FROM changes
                    WHERE operation_id = ?
                """, (operation_id,))

                changes = [
                    {
                        "original": row[0],
                        "new": row[1],
                        "action": row[2]
                    }
                    for row in cursor.fetchall()
                ]

                operations.append({
                    "id": operation_id,
                    "timestamp": timestamp,
                    "changes": changes
                })

            return operations

        finally:
            conn.close()

    def clear_history(self) -> None:
        """Clear all undo history."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            cursor.execute("DELETE FROM changes")
            cursor.execute("DELETE FROM operations")
            conn.commit()
            logging.info("Cleared all undo history from SQLite")
        finally:
            conn.close()

    def get_stats(self) -> Dict:
        """Get database statistics."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            cursor.execute("SELECT COUNT(*) FROM operations")
            operation_count = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM changes")
            change_count = cursor.fetchone()[0]

            return {
                "operation_count": operation_count,
                "change_count": change_count,
                "db_path": str(self.db_path),
                "db_size_bytes": self.db_path.stat().st_size if self.db_path.exists() else 0
            }
        finally:
            conn.close()



