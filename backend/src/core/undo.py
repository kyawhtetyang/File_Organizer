"""
Undo system for reversing file operations.
Tracks operations and allows reverting them.
"""

import json
import shutil
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime
import logging

class UndoManager:
    """Manages undo history and reversal of file operations."""

    def __init__(self, history_file: Path = Path("undo_history.json")):
        self.history_file = history_file
        self.max_history = 10  # Keep last 10 operations

    def save_operation(self, operation_id: str, changes: List[Dict]) -> None:
        """
        Save an operation to history.

        Args:
            operation_id: Unique identifier for this operation
            changes: List of file changes with original and new paths
        """
        history = self._load_history()

        # Add new operation
        history.append({
            "id": operation_id,
            "timestamp": datetime.now().isoformat(),
            "changes": changes
        })

        # Keep only last N operations
        if len(history) > self.max_history:
            history = history[-self.max_history:]

        self._save_history(history)
        logging.info(f"Saved operation {operation_id} with {len(changes)} changes")

    def undo_last_operation(self) -> Dict:
        """
        Undo the most recent operation.

        Returns:
            Dict with status and details of what was undone
        """
        history = self._load_history()

        if not history:
            return {
                "success": False,
                "message": "No operations to undo",
                "undone_count": 0
            }

        # Get last operation
        last_op = history.pop()
        operation_id = last_op["id"]
        changes = last_op["changes"]

        undone_count = 0
        failed_count = 0
        errors = []

        # Reverse each change
        for change in reversed(changes):  # Reverse order to undo properly
            try:
                original = Path(change["original"])
                new = Path(change["new"])
                action = change["action"]

                if action == "DELETE":
                    # Can't undo deletion (file is gone)
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
                    else:
                        logging.warning(f"File not found for undo: {new}")
                        errors.append(f"File not found: {new.name}")
                        failed_count += 1

            except Exception as e:
                logging.error(f"Error undoing change: {e}")
                errors.append(str(e))
                failed_count += 1

        # Save updated history
        self._save_history(history)

        return {
            "success": undone_count > 0,
            "message": f"Undone {undone_count} changes" + (f", {failed_count} failed" if failed_count > 0 else ""),
            "operation_id": operation_id,
            "undone_count": undone_count,
            "failed_count": failed_count,
            "errors": errors
        }

    def get_history(self) -> List[Dict]:
        """Get all operation history."""
        return self._load_history()

    def clear_history(self) -> None:
        """Clear all undo history."""
        self._save_history([])
        logging.info("Cleared undo history")

    def _load_history(self) -> List[Dict]:
        """Load history from file."""
        if not self.history_file.exists():
            return []

        try:
            with open(self.history_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logging.error(f"Error loading undo history: {e}")
            return []

    def _save_history(self, history: List[Dict]) -> None:
        """Save history to file."""
        try:
            with open(self.history_file, 'w') as f:
                json.dump(history, f, indent=2)
        except Exception as e:
            logging.error(f"Error saving undo history: {e}")












