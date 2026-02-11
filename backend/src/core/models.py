
# FileItem = citizen
# ActionType = legal actions
# Pipeline = court
# Steps = lawmakers proposing actions

from dataclasses import dataclass, field
from enum import Enum, auto
from pathlib import Path
from typing import Optional, List, Any

class ActionType(Enum):
    NONE = auto()
    DELETE = auto()
    RENAME = auto()
    MOVE = auto()

@dataclass
class FileItem:
    original_path: Path
    current_path: Path  # Represents path in memory as steps modify it

    # State tracking
    action: ActionType = ActionType.NONE
    destination_path: Optional[Path] = None

    # Metadata
    metadata: dict = field(default_factory=dict)

    @property
    def name(self) -> str:
        return self.current_path.name

    @property
    def suffix(self) -> str:
        return self.current_path.suffix

    def mark_delete(self):
        self.action = ActionType.DELETE

    def mark_rename(self, new_name: str):
        self.action = ActionType.RENAME
        self.current_path = self.current_path.with_name(new_name)
        self.destination_path = self.current_path

    def mark_move(self, new_folder: Path):
        self.action = ActionType.MOVE
        self.current_path = new_folder / self.current_path.name
        self.destination_path = self.current_path

@dataclass
class Context:
    dry_run: bool
    source_root: Path
    target_root: Path
    config: dict = field(default_factory=dict)















