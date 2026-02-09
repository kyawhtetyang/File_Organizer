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
    def scan(source_root: Path, category: str = 'all') -> List[FileItem]:
        if not source_root.exists():
            print(f"Source root does not exist: {source_root}")
            return []

        print(f"Scanning {source_root} for category: {category}")
        items = []
        # Get allowed extensions for the category
        allowed_exts: Set[str] = set()
        if category != 'all':
            allowed_exts = Scanner.EXTENSIONS.get(category, set())

        # Recursively find all files
        # Using os.walk might be faster for large trees, but rglob is cleaner
        # We'll use os.walk to strictly exclude hidden folders if needed, but rglob is fine for now
        for p in source_root.rglob("*"):
            if p.is_file() and not p.name.startswith("."):
                # Filter by category if needed
                if category != 'all':
                    if category == 'others':
                        # Check if it doesn't belong to any known category
                        is_known = False
                        for cat_exts in Scanner.EXTENSIONS.values():
                            if p.suffix.lower() in cat_exts:
                                is_known = True
                                break
                        if is_known:
                            continue
                    else:
                        # Check specific category inclusion
                        if p.suffix.lower() not in allowed_exts:
                            continue

                items.append(FileItem(original_path=p.resolve(), current_path=p.resolve()))

                # Hard limit for performance
                if len(items) >= 50000:
                    break

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
                if category != 'all':
                    ext = os.path.splitext(name)[1].lower()
                    if category == 'others':
                        is_known = False
                        for cat_exts in Scanner.EXTENSIONS.values():
                            if ext in cat_exts:
                                is_known = True
                                break
                        if is_known:
                            continue
                    else:
                        if ext not in allowed_exts:
                            continue

                count += 1
                if limit is not None and count >= limit:
                    truncated = True
                    return count, truncated

        return count, truncated













