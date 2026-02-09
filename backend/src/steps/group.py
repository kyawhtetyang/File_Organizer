import re
from datetime import datetime
from PIL import Image
from PIL.ExifTags import TAGS
from pathlib import Path
from typing import List, Optional
from ..core.step import Step
from ..core.models import Context, FileItem

class GroupStep(Step):
    def get_name(self) -> str:
        return "Step 5: Group by Year/Month (Full Timestamp Standard)"

    # ----------------------------
    # Only match filenames with timestamp (YYYY-MM-DD), optionally with time
    GROUP_PATTERN = re.compile(
        r'^(\d{4})-(\d{1,2})-(\d{1,2})'           # YYYY-MM-DD
        r'(?:[ _-](\d{1,2}-\d{2}-\d{2}(?:[AP]M)?))?', # Optional: HH-MM-SS + optional AM/PM
        re.IGNORECASE
    )

    LOG_SKIPPED = True  # Log files that could not be grouped

    def process(self, context: Context, items: List[FileItem]) -> List[FileItem]:
        # Get grouping config
        group_mode = 'year_month'
        prioritize_filename = True

        if hasattr(context, 'config') and context.config and hasattr(context.config, 'group'):
             group_mode = getattr(context.config.group, 'structure', 'year_month')
             prioritize_filename = getattr(context.config.group, 'prioritize_filename', True)

        for item in items:
            if item.action.name == "DELETE":
                continue

            # Don't group if mode is 'flat'
            if group_mode == 'flat':
                continue

            p = item.current_path
            year, month = None, None

            # Logic based on priority
            # If prioritize_filename is True: Check Filename -> EXIF -> FS
            # If prioritize_filename is False: Check EXIF -> FS (Skip Filename)

            found_date = False

            if prioritize_filename:
                # 1️⃣ Try filename pattern first
                m = self.GROUP_PATTERN.match(p.stem)
                if m:
                    year = m.group(1)
                    month = f"{int(m.group(2)):02d}"
                    found_date = True

            if not found_date:
                # 2️⃣ Try EXIF metadata
                dt = self._get_exif_datetime(item.original_path)
                if not dt:
                    # 3️⃣ Fallback to filesystem timestamp
                    dt = self._get_fs_datetime(item.original_path)

                if dt:
                    year = str(dt.year)
                    month = f"{dt.month:02d}"
                elif self.LOG_SKIPPED and prioritize_filename:
                    # Only log if we tried everything including filename and still failed
                    print(f"[GroupStep] Could not determine date for {p.name}")

            # If we still don't have a date, skip grouping for this file (don't force today's date)
            if not year or not month:
                continue

            # 4️⃣ Create target folder path based on mode
            if group_mode == 'year':
                new_folder = context.source_root / year
            else: # year_month
                new_folder = context.source_root / year / month

            item.mark_move(new_folder)

        return items

    # ----------------------------
    # EXIF helper
    # ----------------------------
    def _get_exif_datetime(self, path: Path) -> Optional[datetime]:
        """Get EXIF DateTimeOriginal if available."""
        if not path.exists():
            return None
        try:
            img = Image.open(path)
            exif = img._getexif()
            if not exif:
                return None
            for k, v in exif.items():
                tag = TAGS.get(k)
                if tag in ("DateTimeOriginal", "DateTimeDigitized", "DateTime"):
                    return datetime.strptime(v, "%Y:%m:%d %H:%M:%S")
        except Exception:
            return None
        return None

    # ----------------------------
    # Filesystem timestamp helper
    # ----------------------------
    def _get_fs_datetime(self, path: Path) -> Optional[datetime]:
        """Cross-platform fallback for file creation/modification date."""
        try:
            stat = path.stat()
            # macOS: use birth time if available
            if hasattr(stat, "st_birthtime"):
                ts = stat.st_birthtime
            else:
                # Windows/Linux fallback
                ts = stat.st_ctime if stat.st_ctime > 0 else stat.st_mtime
            return datetime.fromtimestamp(ts)
        except Exception:
            return None












