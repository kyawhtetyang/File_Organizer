import re
import hashlib
from collections import defaultdict
from typing import List
from datetime import datetime
from ..core.step import Step
from ..core.models import Context, FileItem
from PIL import Image
from PIL.ExifTags import TAGS

# ==============================
# HELPERS
# ==============================
def get_exif_datetime(file_path):
    """Return DateTimeOriginal from EXIF if available, else None"""
    try:
        img = Image.open(file_path)
        exif_data = img._getexif()
        if not exif_data:
            return None
        for tag_id, value in exif_data.items():
            tag = TAGS.get(tag_id)
            if tag == "DateTimeOriginal":
                return datetime.strptime(value, "%Y:%m:%d %H:%M:%S")
    except Exception:
        return None
    return None

def file_hash(file_path, chunk_size=65536):
    """Return SHA256 hash of file"""
    h = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(chunk_size), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return None

# ==============================
# DEDUPLICATION STEP
# ==============================
class DeduplicateStep(Step):
    def get_name(self) -> str:
        return "Step 1: International Standard Deduplicate"

    # ==============================
    # CONFIG
    # ==============================
    FASTER_PROCESS = True           # Skip hashing to speed up process


    SCORE_EXIF_PRIORITY = True       # Use EXIF DateTime as primary score
    SCORE_SIZE_PRIORITY = True       # Use file size in scoring
    BONUS_FORMAT = {".raw": 10000, ".tiff": 10000}  # bonus points for specific formats
    DELETE_DUPLICATES = True         # Actually mark duplicates for deletion
    RENAME_CANONICAL = True          # Rename winner to canonical base name
    HASH_CHUNK_SIZE = 65536          # Chunk size for file hashing
    TEXT = ""                        # Optional text to append to canonical filename

    # ------------------------------
    # PROCESSING
    # ------------------------------
    def process(self, context: Context, items: List[FileItem]) -> List[FileItem]:
        faster_process = self.FASTER_PROCESS
        deduplicate_cfg = getattr(context.config, "deduplicate", None)
        if deduplicate_cfg is not None:
            faster_process = getattr(deduplicate_cfg, "faster_process", faster_process)

        duplicate_pattern = re.compile(r"^(.*) \((\d+)\)(\.[^.]+)$")
        copy_pattern = re.compile(r"^Copy of (.*)(\.[^.]+)$")

        # Group files by (folder, base_name, extension)
        grouped = defaultdict(list)
        for item in items:
            p = item.current_path
            match = duplicate_pattern.match(p.name)
            match_copy = copy_pattern.match(p.name)

            if match:
                base, num, ext = match.groups()
            elif match_copy:
                base, ext = match_copy.groups()
            else:
                base, ext = p.stem, p.suffix

            key = (p.parent, base, ext)
            grouped[key].append(item)

        result_items = []

        for (parent, base, ext), file_list in grouped.items():

            scored = []
            hashes_seen = set()

            for item in file_list:
                p = item.current_path
                stat = p.stat()

                # -----------------------
                # Compute score
                # -----------------------
                score = 0

                # 1️⃣ EXIF capture date (primary)
                if self.SCORE_EXIF_PRIORITY:
                    dt = get_exif_datetime(p)
                    if dt:
                        score += int(dt.timestamp())
                    else:
                        score += int(stat.st_mtime)

                # 2️⃣ File size (secondary)
                if self.SCORE_SIZE_PRIORITY:
                    score += stat.st_size

                # 3️⃣ Format/quality bonus
                score += self.BONUS_FORMAT.get(p.suffix.lower(), 0)

                # 4️⃣ Weak hint from name
                if duplicate_pattern.match(p.name) or copy_pattern.match(p.name):
                    score -= 1
                elif p.name == f"{base}{ext}":
                    score += 1000

                # 5️⃣ Optional hashing (skip if FASTER_PROCESS=True)
                if not faster_process:
                    h = file_hash(p, self.HASH_CHUNK_SIZE)
                    if h in hashes_seen:
                        if self.DELETE_DUPLICATES:
                            item.mark_delete()
                        continue
                    else:
                        hashes_seen.add(h)

                scored.append((score, item))

            if not scored:
                continue

            # Pick highest score
            scored.sort(reverse=True, key=lambda x: x[0])
            _, winner_item = scored[0]

            # Rename winner to canonical name
            if self.RENAME_CANONICAL:
                canonical_name = f"{base}{ext}"
                if self.TEXT:
                    canonical_name = f"{base}_{self.TEXT}{ext}"
                if winner_item.current_path.name != canonical_name:
                    winner_item.mark_rename(canonical_name)

            result_items.append(winner_item)

            # Delete all others
            for _, loser_item in scored[1:]:
                if self.DELETE_DUPLICATES:
                    loser_item.mark_delete()
                result_items.append(loser_item)

        return result_items











