import os
from pathlib import Path
from typing import List, Set, Optional, Tuple
from .models import FileItem

class Scanner:
    """
    Handles scanning of files with optional category filtering.
    """

    # Extension categories
    EXTENSIONS = {
        'photos': {'.jpg', '.jpeg', '.png', '.heic', '.gif', '.webp', '.tiff', '.bmp', '.raw', '.svg'},
        'video': {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv'},
        'audio': {'.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'},
        'docs': {'.pdf', '.doc', '.docx', '.txt', '.rtf', '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.md'},
        'code': {'.py', '.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.json', '.yaml', '.yml', '.sh', '.sql', '.c', '.cpp', '.h', '.java', '.go', '.rs', '.php'}
    }

    @staticmethod
    def _matches_category(ext: str, category: str, allowed_exts: Set[str]) -> bool:
        if category == 'all':
            return True
        if category == 'others':
            for cat_exts in Scanner.EXTENSIONS.values():
                if ext in cat_exts:
                    return False
            return True
        return ext in allowed_exts

    @staticmethod
    def scan(source_root: Path, category: str = 'all', limit: Optional[int] = None) -> List[FileItem]:
        if not source_root.exists():
            print(f"Source root does not exist: {source_root}")
            return []

        print(f"Scanning {source_root} for category: {category}")
        items = []
        # Get allowed extensions for the category
        allowed_exts: Set[str] = set()
        if category != 'all':
            allowed_exts = Scanner.EXTENSIONS.get(category, set())

        for root, dirs, files in os.walk(source_root):
            dirs[:] = [d for d in dirs if not d.startswith(".")]
            for name in files:
                if name.startswith("."):
                    continue

                ext = os.path.splitext(name)[1].lower()
                if not Scanner._matches_category(ext, category, allowed_exts):
                    continue

                p = (Path(root) / name).resolve()
                items.append(FileItem(original_path=p, current_path=p))

                # User-configurable processing limit
                if limit is not None and len(items) >= limit:
                    return items

                # Hard limit for performance
                if len(items) >= 50000:
                    return items

        return items

    @staticmethod
    def scan_count(source_root: Path, category: str = 'all', limit: Optional[int] = None) -> Tuple[int, bool]:
        if not source_root.exists():
            print(f"Source root does not exist: {source_root}")
            return 0, False

        allowed_exts: Set[str] = set()
        if category != 'all':
            allowed_exts = Scanner.EXTENSIONS.get(category, set())

        count = 0
        truncated = False
        for root, dirs, files in os.walk(source_root):
            dirs[:] = [d for d in dirs if not d.startswith(".")]
            for name in files:
                if name.startswith("."):
                    continue
                ext = os.path.splitext(name)[1].lower()
                if not Scanner._matches_category(ext, category, allowed_exts):
                    continue

                count += 1
                if limit is not None and count >= limit:
                    truncated = True
                    return count, truncated

        return count, truncated












