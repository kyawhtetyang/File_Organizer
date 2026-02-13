import re
import hashlib
from collections import defaultdict
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from ..core.step import Step
from ..core.models import Context, FileItem
from PIL import Image
from PIL.ExifTags import TAGS

# ==============================
# HELPERS
# ==============================
_HASH_CACHE: Dict[str, Tuple[Tuple[int, int, Optional[int]], str]] = {}
_HASH_CACHE_MAX_ENTRIES = 50000


def clear_hash_cache() -> None:
    _HASH_CACHE.clear()


def _file_signature(file_path):
    """
    Signature used to validate cached hashes.
    Includes size + mtime_ns + inode (when available).
    """
    try:
        stat = file_path.stat()
        inode = getattr(stat, "st_ino", None)
        return (stat.st_size, int(stat.st_mtime_ns), inode)
    except Exception:
        return None


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
    """Return SHA256 hash of file with strict stat-based cache validation."""
    signature = _file_signature(file_path)
    if signature is None:
        return None

    key = str(file_path)
    cached = _HASH_CACHE.get(key)
    if cached and cached[0] == signature:
        return cached[1]

    h = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(chunk_size), b""):
                h.update(chunk)
        digest = h.hexdigest()
        if len(_HASH_CACHE) >= _HASH_CACHE_MAX_ENTRIES:
            _HASH_CACHE.clear()
        _HASH_CACHE[key] = (signature, digest)
        return digest
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
    DEFAULT_MODE = "safe"  # "safe" | "smart"

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
        mode = self.DEFAULT_MODE
        deduplicate_cfg = getattr(context.config, "deduplicate", None)
        if deduplicate_cfg is not None:
            cfg_mode = getattr(deduplicate_cfg, "mode", None)
            if cfg_mode in {"safe", "smart"}:
                mode = cfg_mode

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

        for (_parent, base, ext), file_list in grouped.items():
            records: List[Dict[str, Any]] = []
            has_suspicious_name = False
            for item in file_list:
                p = item.current_path
                is_suspicious = bool(duplicate_pattern.match(p.name) or copy_pattern.match(p.name))
                if is_suspicious:
                    has_suspicious_name = True
                records.append({
                    "item": item,
                    "path": p,
                    "is_suspicious": is_suspicious,
                    "score": self._compute_score(p, base, ext, is_suspicious),
                })

            if not records:
                continue

            should_verify_hash = mode == "smart" or (mode == "safe" and has_suspicious_name)
            if not should_verify_hash:
                result_items.extend([r["item"] for r in records])
                continue

            # Hash only records that can share identity: same grouped key and same byte size.
            size_groups: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
            for record in records:
                try:
                    size = record["path"].stat().st_size
                except OSError:
                    size = -1
                record["size"] = size
                size_groups[size].append(record)

            duplicate_clusters: List[List[Dict[str, Any]]] = []
            for size, size_group in size_groups.items():
                if size < 0 or len(size_group) < 2:
                    continue
                hash_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
                for record in size_group:
                    h = file_hash(record["path"], self.HASH_CHUNK_SIZE)
                    if not h:
                        continue
                    hash_groups[h].append(record)
                for cluster in hash_groups.values():
                    if len(cluster) > 1:
                        duplicate_clusters.append(cluster)

            deleted_any = False
            for cluster in duplicate_clusters:
                winner = max(cluster, key=lambda r: r["score"])
                winner["item"].metadata["deduplicate_reason"] = "Winner among hash-identical duplicates"
                for record in cluster:
                    if record is winner:
                        continue
                    if self.DELETE_DUPLICATES:
                        record["item"].metadata["deduplicate_reason"] = "Hash-identical duplicate"
                        record["item"].mark_delete()
                        deleted_any = True

            if deleted_any and self.RENAME_CANONICAL:
                survivors = [r for r in records if r["item"].action.name != "DELETE"]
                if survivors:
                    winner = max(survivors, key=lambda r: r["score"])
                    canonical_name = f"{base}_{self.TEXT}{ext}" if self.TEXT else f"{base}{ext}"
                    if winner["item"].current_path.name != canonical_name:
                        winner["item"].mark_rename(canonical_name)

            result_items.extend([r["item"] for r in records])

        return result_items

    def _compute_score(self, path, base: str, ext: str, is_suspicious: bool) -> int:
        score = 0
        try:
            stat = path.stat()
        except OSError:
            return score

        if self.SCORE_EXIF_PRIORITY:
            dt = get_exif_datetime(path)
            if dt:
                score += int(dt.timestamp())
            else:
                score += int(stat.st_mtime)

        if self.SCORE_SIZE_PRIORITY:
            score += stat.st_size

        score += self.BONUS_FORMAT.get(path.suffix.lower(), 0)
        if is_suspicious:
            score -= 1
        elif path.name == f"{base}{ext}":
            score += 1000
        return score





