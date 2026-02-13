import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
import subprocess
import shutil
import os
from pathlib import Path

from ..core.step import Step
from ..core.models import Context, FileItem, ActionType
from ..utils.timestamp_formatter import TimestampFormatter

logging.basicConfig(level=logging.INFO)

class StandardizeStep(Step):
    def get_name(self) -> str:
        return "Step 3.2: Standardize (Folder-Based Standardize)"

    def process(self, context: Context, items: List[FileItem]) -> List[FileItem]:
        logging.info(f"Running StandardizeStep on {len(items)} items")

        # 1. Group files by parent folder
        folder_groups: Dict[Path, List[FileItem]] = {}
        for item in items:
            if item.action.name == "DELETE":
                continue
            parent = item.current_path.parent
            if parent not in folder_groups:
                folder_groups[parent] = []
            folder_groups[parent].append(item)

        # 2. Process each folder
        for folder, group_items in folder_groups.items():
            folder_name = folder.name

            # Try to parse folder name as timestamp
            dt = self._parse_folder_name(folder_name, context)

            # Fallback: Check config to see if we should try filenames
            file_level_fallback = not dt and hasattr(context.config, "standardize") and context.config.standardize.use_filename_fallback
            if file_level_fallback:
                logging.info(f"Fallback enabled: using each file's filename timestamp in {folder_name}")

            if not dt and not file_level_fallback:
                fallback_enabled = False
                if hasattr(context.config, "standardize"):
                    fallback_enabled = context.config.standardize.use_filename_fallback
                logging.info(f"Skipping folder {folder_name}: Does not match timestamp format (Fallback: {fallback_enabled})")
                # Keep items valid for downstream steps/tests even when this step cannot standardize.
                for item in group_items:
                    if item.destination_path is None:
                        item.destination_path = item.current_path
                continue

            logging.info(f"Processing folder {folder_name} (Date: {dt}) - {len(group_items)} files")

            # Sort files to ensure stable sequence (e.g. by name)
            group_items.sort(key=lambda x: x.current_path.name)

            # Use microsecond increment for unique naming
            micro_inc = 1

            for index, item in enumerate(group_items):
                file_path = item.current_path

                # Determine timestamp source
                dt_source = dt
                if file_level_fallback and not dt_source:
                    dt_source = self._parse_filename_timestamp(file_path.name)
                    if not dt_source:
                        logging.info(f"Skipping file {file_path.name}: No valid filename timestamp")
                        continue

                # Increment date slightly for uniqueness/sequence in filename
                dt_unique = dt_source + timedelta(microseconds=(index + 1) * micro_inc)

                # -----------------------
                # STEP 1: Rename & Flatten
                # -----------------------
                # Generate new filename using standard formatter
                new_filename = self._generate_filename(file_path, dt_unique, context)

                # Destination: Flatten into source root only (never beyond root)
                # e.g. Source/2024-01-01/img.jpg -> Source/2024-01-01_000001.jpg
                dest_dir = context.source_root
                try:
                    folder.parent.relative_to(context.source_root)
                    dest_dir = folder.parent
                except ValueError:
                    dest_dir = context.source_root
                new_path = dest_dir / new_filename

                # Handle collisions (though unlikely with high precision timestamp)
                counter = 1
                base_stem = new_path.stem
                while new_path.exists() and new_path != file_path:
                    new_path = dest_dir / f"{base_stem}_{counter}{new_path.suffix}"
                    counter += 1

                if not context.dry_run:
                    try:
                        shutil.move(str(file_path), str(new_path))
                        logging.info(f"Moved/Renamed: {file_path.name} → {new_path.name}")

                        item.current_path = new_path
                        item.action = ActionType.MOVE # Technically move+rename
                        item.destination_path = new_path

                        # CRITICAL FIX: Since we physically moved it, we must update original_path
                        # so subsequent steps/execution phase can find it.
                        item.original_path = new_path

                        # Update file_path context for next steps
                        file_path = new_path
                    except OSError as e:
                        logging.error(f"Failed to move {file_path} to {new_path}: {e}")
                        continue
                else:
                    logging.info(f"[Dry Run] Would move: {file_path.name} → {new_path.name}")
                    # For dry run simulation, update item path so subsequent logic works on 'new' path
                    item.destination_path = new_path

                # -----------------------
                # STEP 2: Update Metadata + Filesystem Times
                # -----------------------
                # Using dt_unique which corresponds to the new filename
                if not context.dry_run:
                    # Always update filesystem mtime/atime
                    self.set_filesystem_time(file_path, dt_unique)
                    # Update EXIF if exiftool is available
                    if shutil.which("exiftool"):
                        self.run_exiftool(file_path, dt_unique)
                    else:
                        logging.warning("ExifTool not found; EXIF timestamps not updated.")
                    item.metadata_timestamp = dt_unique
                else:
                    item.metadata_timestamp = dt_unique

            # 3. Remove empty folder after flattening (if not dry run)
            if not context.dry_run:
                try:
                    # Only remove if empty
                    if not any(folder.iterdir()):
                        folder.rmdir()
                        logging.info(f"Removed empty folder: {folder}")
                except Exception as e:
                    logging.warning(f"Could not remove folder {folder}: {e}")

        return items

    def _parse_folder_name(self, name: str, context: Context) -> Optional[datetime]:
        """
        Parse folder name based on global timestamp config.
        Only supports pCloud style for now as requested: "2024-04-24 1-52-24PM"
        """
        # TODO: Make this dynamic based on config if needed, but user gave specific example
        # matching the pcloud preset without microseconds/sequence.

        # Format: YYYY-MM-DD H-MM-SSPM
        # Note: 1-52-24PM implies 12 hour format with dashes.

        patterns = [
            # pCloud style (12hr): 2025-04-24 1-52-24PM
            "%Y-%m-%d %I-%M-%S%p",
            # Google style (24hr): 2025-04-24_13-52-24 (example)
            "%Y-%m-%d_%H-%M-%S",
             # Manual style: 2025-04-24 13-52-24
            "%Y-%m-%d %H-%M-%S",
        ]

        for fmt in patterns:
            try:
                return datetime.strptime(name, fmt)
            except ValueError:
                continue
        return None

    def _parse_filename_timestamp(self, filename: str) -> Optional[datetime]:
        """
        Parse timestamp from filename when folder name is not usable.
        Matches: 2001-11-15 12-10-00AM or 2024-05-20 14-30-00
        """
        pattern = re.compile(r'(\d{4})-(\d{2})-(\d{2})[ _](\d{1,2})-(\d{2})-(\d{2})\s?([AP]M)?', re.IGNORECASE)
        match = pattern.search(filename)
        if not match:
            return None

        y, m, d, h, mn, s, ampm = match.groups()
        try:
            h_int = int(h)
            if ampm:
                is_pm = ampm.upper() == 'PM'
                is_am = ampm.upper() == 'AM'
                if is_pm and h_int != 12:
                    h_int += 12
                elif is_am and h_int == 12:
                    h_int = 0
            return datetime(int(y), int(m), int(d), h_int, int(mn), int(s))
        except Exception:
            return None

    def _generate_filename(self, original_path: Path, dt: datetime, context: Context) -> str:
        """Generate filename using standard formatter (reusing logic from Metadata step)."""
        preset = "pcloud"
        if hasattr(context.config, 'timestamp_format'):
             preset = context.config.timestamp_format.preset

        global_12h = None
        if hasattr(context.config, 'timestamp_format'):
             if hasattr(context.config.timestamp_format, 'hour_format_12'):
                 global_12h = context.config.timestamp_format.hour_format_12

        formatter = TimestampFormatter(preset, global_12h_format=global_12h)
        timestamp_str = formatter.format(dt)
        return f"{timestamp_str}{original_path.suffix}"

    def run_exiftool(self, file_path: Path, dt: datetime) -> bool:
        """Reuse ExifTool logic from BatchMetadataStep."""
        dt_str = dt.strftime("%Y:%m:%d %H:%M:%S")
        cmd = [
            "exiftool",
            "-overwrite_original",
            "-q",
            f"-AllDates={dt_str}",
            f"-CreationDate={dt_str}",
            f"-FileCreateDate={dt_str}",
            f"-FileModifyDate={dt_str}",
            f"-MediaCreateDate={dt_str}",
            f"-MediaModifyDate={dt_str}",
            str(file_path)
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True)
            return res.returncode == 0
        except Exception as e:
            logging.error(f"ExifTool error: {e}")
            return False

    def set_filesystem_time(self, file_path: Path, dt: datetime):
        try:
            ts = dt.timestamp()
            os.utime(file_path, (ts, ts))
        except:
            pass






