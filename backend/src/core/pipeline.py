from typing import List
from .models import Context, FileItem, ActionType
from .step import Step
import shutil

class Pipeline:
    def __init__(self, context: Context):
        self.context = context
        self.steps: List[Step] = []

    def add_step(self, step: Step):
        self.steps.append(step)

    def run(self, initial_files: List[FileItem]):
        items = initial_files

        # 1. Planning Phase
        print(f"🔵 Starting PLAN Phase with {len(items)} files...")
        for step in self.steps:
            print(f"  👉 Planning Step: {step.get_name()}")
            items = step.process(self.context, items)

        print(f"🟢 Plan Complete. Final item count: {len(items)}\n")

        # 2. Execution Phase
        self._execute_changes(items)

    def _execute_changes(self, items: List[FileItem]):
        print(f"🔴 Starting EXECUTION Phase (Dry Run: {self.context.dry_run})...")

        for item in items:
            if item.action == ActionType.NONE:
                continue

            if item.action == ActionType.DELETE:
                if self.context.dry_run:
                    print(f"  [DRY] DELETE: {item.original_path}")
                else:
                    try:
                        if item.original_path.exists():
                            # Move to undo trash instead of permanent delete
                            trash_root = self.context.source_root / ".undo_trash"
                            trash_root.mkdir(parents=True, exist_ok=True)

                            try:
                                rel = item.original_path.relative_to(self.context.source_root)
                                trash_path = trash_root / rel
                            except ValueError:
                                trash_path = trash_root / item.original_path.name

                            trash_path.parent.mkdir(parents=True, exist_ok=True)

                            # Collision handling in trash
                            if trash_path.exists():
                                counter = 1
                                base = trash_path.stem
                                suffix = trash_path.suffix
                                while True:
                                    candidate = trash_path.with_name(f"{base}_{counter}{suffix}")
                                    if not candidate.exists():
                                        trash_path = candidate
                                        break
                                    counter += 1

                            shutil.move(str(item.original_path), str(trash_path))
                            item.destination_path = trash_path
                            print(f"  ✅ TRASHED: {item.original_path} -> {trash_path}")
                    except Exception as e:
                        print(f"  ❌ ERROR Deleting {item.original_path}: {e}")

            elif item.action == ActionType.RENAME or item.action == ActionType.MOVE:
                src = item.original_path
                dst = item.destination_path

                if not dst:
                    continue

                if self.context.dry_run:
                    print(f"  [DRY] {item.action.name}: {src} -> {dst}")
                else:
                    try:
                        dst.parent.mkdir(parents=True, exist_ok=True)
                        shutil.move(str(src), str(dst))
                        print(f"  ✅ {item.action.name}: {src.name} -> {dst}")
                    except Exception as e:
                        print(f"  ❌ ERROR Moving {src} to {dst}: {e}")















