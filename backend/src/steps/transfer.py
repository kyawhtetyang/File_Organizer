from typing import List
from pathlib import Path
import os
from ..core.step import Step
from ..core.models import Context, FileItem

class TransferStep(Step):
    JUNK_FILES = {".DS_Store", "Thumbs.db", "desktop.ini"}
    JUNK_DIRS = {".Spotlight-V100", ".Trashes"}
    PROTECTED_HIDDEN = {".git"}

    def get_name(self) -> str:
        return "Step 6: Transfer Grouped Folders (Robust & International)"

    def process(self, context: Context, items: List[FileItem]) -> List[FileItem]:
        overwrite = False
        if hasattr(context, 'config') and context.config and hasattr(context.config, 'transfer'):
             overwrite = getattr(context.config.transfer, 'overwrite', False)

        for item in items:
            if item.action.name == "DELETE":
                continue

            # Check if a previous step (like Group) already planned a move
            # If so, use that planned destination as the basis for this transfer
            path_to_transfer = item.destination_path if item.destination_path else item.current_path

            # 1. Determine relative path from source root
            try:
                rel = path_to_transfer.relative_to(context.source_root)
            except ValueError:
                # If path is not relative to source (e.g. external path), try original
                try:
                    rel = item.current_path.relative_to(context.source_root)
                except ValueError:
                    continue

            # 2. Construct target path
            # We relax the strict "depth >= 3" check to allow moving any files within source
            new_path = context.target_root / rel

            # 3. Plan the Move (Do not execute here!)
            dest_file = new_path

            # Simple collision avoidance for planning (Only if overwrite is OFF)
            if not overwrite:
                counter = 1
                while dest_file.exists() and dest_file != item.current_path:
                     dest_file = new_path.with_name(f"{new_path.stem}_{counter}{new_path.suffix}")
                     counter += 1

            # Use mark_move to set the destination action
            # Note: mark_move expects a FOLDER, and sets new name to current name.
            # If we renamed due to collision, we must handle that.
            if dest_file.name != item.name:
                 # Manually set because mark_rename sets action=RENAME which might overwrite MOVE
                 # We want MOVE with a new name.
                 item.action = item.action.MOVE
                 # Update destination path directly
                 item.destination_path = dest_file
            else:
                 item.mark_move(dest_file.parent)

            # Auto-cleanup logic moved to cleanup() method
        return items

    def cleanup(self, context: Context):
        if not context.source_root.exists():
            return

        cleanup_hidden_files = False
        if hasattr(context, 'config') and context.config and hasattr(context.config, 'transfer'):
            cleanup_hidden_files = getattr(context.config.transfer, 'cleanup_hidden_files', False)

        # Walk bottom-up to remove nested empty folders and parent folders.
        for dirpath, dirnames, filenames in os.walk(context.source_root, topdown=False):
            current_dir = Path(dirpath)

            # Only remove hidden/system artifacts in explicit cleanup mode.
            if cleanup_hidden_files:
                for filename in filenames:
                    is_junk_file = filename in self.JUNK_FILES or filename.startswith("._")
                    is_hidden_file = filename.startswith(".") and filename not in self.PROTECTED_HIDDEN
                    if is_junk_file or is_hidden_file:
                        try:
                            (current_dir / filename).unlink()
                        except Exception:
                            pass

            for dirname in dirnames:
                full_path = current_dir / dirname
                try:
                    if not self._has_non_ignorable_entries(full_path, cleanup_hidden_files):
                        full_path.rmdir()
                except Exception:
                    pass

            # Also remove this directory itself if now empty (but never remove source root).
            if current_dir != context.source_root:
                try:
                    if not self._has_non_ignorable_entries(current_dir, cleanup_hidden_files):
                        current_dir.rmdir()
                except Exception:
                    pass

    def _is_ignorable_entry(self, name: str, is_dir: bool, cleanup_hidden_files: bool) -> bool:
        if cleanup_hidden_files:
            if is_dir and name in self.JUNK_DIRS:
                return True
            if not is_dir and (name in self.JUNK_FILES or name.startswith("._")):
                return True
            if name.startswith(".") and name not in self.PROTECTED_HIDDEN:
                return True
        return False

    def _has_non_ignorable_entries(self, directory: Path, cleanup_hidden_files: bool) -> bool:
        try:
            for entry in directory.iterdir():
                if not self._is_ignorable_entry(entry.name, entry.is_dir(), cleanup_hidden_files):
                    return True
            return False
        except Exception:
            return True













