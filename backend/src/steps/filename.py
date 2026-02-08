import re
import mimetypes
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Tuple
from PIL import Image
from PIL.ExifTags import TAGS

from ..core.step import Step
from ..core.models import Context, FileItem
from ..utils.timestamp_formatter import TimestampFormatter

try:
    import magic  # pip install python-magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False


class FilenameStep(Step):
    """
    Unified step that handles Prefix -> Bodyname -> Extension in one go.
    """

    # -----------------------
    # CONFIG (Defaults)
    # -----------------------
    ADD_TIMESTAMP = True
    TIMELINE_MODE = "timeline_plus"  # "off" | "timeline_only" | "timeline_plus"
    HOUR_FORMAT_12 = True
    FALLBACK_TIMESTAMP = "0000-00-00_00-00-00AM"

    REPLACE_BODYNAME = ""
    APPEND_FIRST_TEXT = ""
    APPEND_SECOND_TEXT = ""
    SEPARATOR = "_"

    CLEAN_EXTENSIONS = True
    UNIFORM_EXTENSIONS = True

    # -----------------------
    # PREFIX DETECTION
    # -----------------------
    PREFIX_PATTERNS = [
        re.compile(
            r'^'
            r'\d{4}[-./]\d{1,2}[-./]\d{1,2}'
            r'(?:[_ .-]\d{1,2}[-:]\d{2}[-:]\d{2}(?:[AP]M)?)?_?'
        ),
        re.compile(r'^(\(\d+\)|\[\d+\]|\d+\.)[-_ .]?'),
        re.compile(r'^\d{1,6}[_-]')
    ]

    FILENAME_FULL_PATTERN = re.compile(
        r'(\d{4}-\d{2}-\d{2})[_ ](\d{2}-\d{2}-\d{2})(AM|PM)?',
        re.IGNORECASE
    )
    FILENAME_DATE_ONLY = re.compile(r'(\d{4}-\d{2}-\d{2})')

    # -----------------------
    # EXTENSION MAPPING
    # -----------------------
    UNIFORM_MAPPING = {
        ".jpeg": ".jpg",
        ".jpg": ".jpg",
        ".png": ".jpg",
        ".tiff": ".tif",
        ".tif": ".tif",
        ".heic": ".jpg",
        ".heif": ".jpg",
        ".webp": ".jpg",
        ".bmp": ".jpg",
        ".raw": ".jpg",

        ".mov": ".mp4",
        ".avi": ".mp4",
        ".mkv": ".mp4",
        ".wmv": ".mp4",
        ".flv": ".mp4",
        ".mp4": ".mp4",

        ".mp3": ".mp3",
        ".wav": ".wav",
        ".flac": ".flac",
        ".aac": ".aac",
        ".ogg": ".ogg",

        ".yaml": ".yml",
        ".yml": ".yml",
        ".htm": ".html",
        ".html": ".html",
        ".text": ".txt",
        ".txt": ".txt",
        ".json": ".json",
        ".xml": ".xml",
        ".md": ".md",
        ".csv": ".csv",
        ".doc": ".docx",
        ".docx": ".docx",
        ".xls": ".xlsx",
        ".xlsx": ".xlsx",
        ".ppt": ".pptx",
        ".pptx": ".pptx",
        ".pdf": ".pdf",

        ".zip": ".zip",
        ".rar": ".rar",
        ".7z": ".7z",
        ".tar": ".tar",
        ".gz": ".gz",
        ".bz2": ".bz2",
        ".xz": ".xz",
    }

    MULTIPART_EXTENSIONS = {".tar.gz", ".tar.bz2", ".tar.xz"}

    def get_name(self) -> str:
        return "Step 3: Filename (Prefix, Body, Extension)"

    # -----------------------
    # PROCESS
    # -----------------------
    def process(self, context: Context, items: List[FileItem]) -> List[FileItem]:
        self._load_config(context)

        body_existing = set()
        extension_seen = set()

        for item in items:
            if item.action.name == "DELETE":
                continue

            original_name = item.current_path.name
            working_path = item.current_path

            # 1) Prefix
            prefixed_name = self._apply_prefix(working_path, item.original_path, context)
            if prefixed_name != working_path.name:
                working_path = working_path.with_name(prefixed_name)

            # 2) Bodyname
            working_path = self._apply_bodyname(working_path, body_existing)

            # 3) Extension
            working_path = self._apply_extension(working_path, extension_seen)

            if working_path.name != original_name:
                item.mark_rename(working_path.name)

        return items

    # -----------------------
    # CONFIG LOADER
    # -----------------------
    def _load_config(self, context: Context) -> None:
        def get_val(obj, key, default):
            if isinstance(obj, dict):
                return obj.get(key, default)
            return getattr(obj, key, default)

        prefix_cfg = None
        if hasattr(context.config, "prefix"):
            prefix_cfg = context.config.prefix
        elif isinstance(context.config, dict):
            prefix_cfg = context.config.get("prefix")

        rename_cfg = None
        if hasattr(context.config, "rename"):
            rename_cfg = context.config.rename
        elif isinstance(context.config, dict):
            rename_cfg = context.config.get("rename")

        extension_cfg = None
        if hasattr(context.config, "extension"):
            extension_cfg = context.config.extension
        elif isinstance(context.config, dict):
            extension_cfg = context.config.get("extension")

        if prefix_cfg:
            self.ADD_TIMESTAMP = get_val(prefix_cfg, "add_timestamp", self.ADD_TIMESTAMP)
            self.TIMELINE_MODE = get_val(prefix_cfg, "timeline_mode", self.TIMELINE_MODE)

            # Backward-compat: if timeline_mode is missing/invalid, derive from add_timestamp.
            has_timeline_mode = (
                ("timeline_mode" in prefix_cfg) if isinstance(prefix_cfg, dict)
                else hasattr(prefix_cfg, "timeline_mode")
            )
            if not has_timeline_mode or self.TIMELINE_MODE not in ("off", "timeline_only", "timeline_plus"):
                self.TIMELINE_MODE = "timeline_plus" if self.ADD_TIMESTAMP else "off"

            # Keep add_timestamp consistent with timeline_mode when provided.
            if self.TIMELINE_MODE == "off":
                self.ADD_TIMESTAMP = False
            else:
                self.ADD_TIMESTAMP = True

        if hasattr(context.config, "timestamp_format"):
            if hasattr(context.config.timestamp_format, "hour_format_12"):
                self.HOUR_FORMAT_12 = context.config.timestamp_format.hour_format_12
        elif isinstance(context.config, dict) and "timestamp_format" in context.config:
            self.HOUR_FORMAT_12 = context.config["timestamp_format"].get("hour_format_12", self.HOUR_FORMAT_12)

        if rename_cfg:
            self.REPLACE_BODYNAME = get_val(rename_cfg, "replace_bodyname", self.REPLACE_BODYNAME) or ""
            self.APPEND_FIRST_TEXT = get_val(rename_cfg, "append_first_text", self.APPEND_FIRST_TEXT) or ""
            self.APPEND_SECOND_TEXT = get_val(rename_cfg, "append_second_text", self.APPEND_SECOND_TEXT) or ""

            if self.REPLACE_BODYNAME:
                self.REPLACE_BODYNAME = self.REPLACE_BODYNAME.strip()

        if extension_cfg:
            self.CLEAN_EXTENSIONS = get_val(extension_cfg, "clean_extensions", self.CLEAN_EXTENSIONS)
            self.UNIFORM_EXTENSIONS = get_val(extension_cfg, "uniform_extensions", self.UNIFORM_EXTENSIONS)

    # -----------------------
    # PREFIX LOGIC
    # -----------------------
    def _apply_prefix(self, current_path: Path, data_source_path: Path, context: Context) -> str:
        if not self.ADD_TIMESTAMP or self.TIMELINE_MODE == "off":
            return current_path.name

        if self.TIMELINE_MODE == "timeline_plus" and self.FILENAME_FULL_PATTERN.match(current_path.name):
            return current_path.name

        timestamp = self._build_timestamp(current_path.name, data_source_path, context)
        if self.TIMELINE_MODE == "timeline_only":
            new_name = f"{timestamp}{current_path.suffix}"
        else:
            new_name = f"{timestamp}_{current_path.name}"

        parent = current_path.parent
        counter = 1
        test_path = parent / new_name

        while test_path.exists():
            if self.TIMELINE_MODE == "timeline_only":
                new_name = f"{timestamp}_{counter}{current_path.suffix}"
            else:
                new_name = f"{timestamp}_{current_path.stem}_{counter}{current_path.suffix}"
            test_path = parent / new_name
            counter += 1

        return new_name

    def _build_timestamp(self, current_filename: str, data_source_path: Path, context: Context) -> str:
        ts = self._extract_from_metadata(data_source_path, context)
        if ts:
            return ts

        ts = self._extract_from_filename(current_filename)
        if ts:
            return ts

        ts = self._extract_from_mtime(data_source_path, context)
        if ts:
            return ts

        return self._format_dt(datetime.now(), context)

    def _extract_from_filename(self, filename: str) -> Optional[str]:
        m = self.FILENAME_FULL_PATTERN.search(filename)
        if m:
            date = m.group(1)
            time = m.group(2)
            suffix = m.group(3)
            if self.HOUR_FORMAT_12:
                return f"{date}_{time}{suffix or 'AM'}"
            return f"{date}_{time}"

        m = self.FILENAME_DATE_ONLY.search(filename)
        if m:
            return (
                f"{m.group(1)}_00-00-00AM"
                if self.HOUR_FORMAT_12
                else f"{m.group(1)}_00-00-00"
            )

        return None

    def _extract_from_metadata(self, path: Path, context: Context) -> Optional[str]:
        if not path.exists():
            return None
        try:
            img = Image.open(path)
            exif = img._getexif()
            if not exif:
                return None

            for tag_id, value in exif.items():
                tag = TAGS.get(tag_id)
                if tag in ("DateTimeOriginal", "DateTimeDigitized", "DateTime"):
                    dt = datetime.strptime(value, "%Y:%m:%d %H:%M:%S")
                    return self._format_dt(dt, context)
        except Exception:
            pass

        return None

    def _extract_from_mtime(self, path: Path, context: Context) -> Optional[str]:
        try:
            if not path.exists():
                return None
            dt = datetime.fromtimestamp(path.stat().st_mtime)
            return self._format_dt(dt, context)
        except Exception:
            return None

    def _format_dt(self, dt: datetime, context: Context) -> str:
        preset = "pcloud"
        if hasattr(context.config, "timestamp_format"):
            preset = context.config.timestamp_format.preset
        elif isinstance(context.config, dict) and "timestamp_format" in context.config:
            preset = context.config["timestamp_format"].get("preset", "pcloud")

        formatter = TimestampFormatter(preset, global_12h_format=self.HOUR_FORMAT_12)
        return formatter.format(dt)

    # -----------------------
    # BODYNAME LOGIC
    # -----------------------
    def _apply_bodyname(self, file_path: Path, existing_names: set) -> Path:
        stem = file_path.stem
        suffix = file_path.suffix

        prefix, body = self._split_prefix_body(stem)

        if self.REPLACE_BODYNAME:
            body = self.REPLACE_BODYNAME

        if self.APPEND_FIRST_TEXT:
            body = f"{body}{self.SEPARATOR}{self.APPEND_FIRST_TEXT}" if body else self.APPEND_FIRST_TEXT

        if self.APPEND_SECOND_TEXT:
            body = f"{body}{self.SEPARATOR}{self.APPEND_SECOND_TEXT}" if body else self.APPEND_SECOND_TEXT

        if prefix and body:
            sep = "" if prefix[-1] in "_-. " else self.SEPARATOR
            final_name = f"{prefix}{sep}{body}"
        elif prefix:
            final_name = prefix.rstrip("_-. ")
        elif body:
            final_name = body
        else:
            final_name = "file"

        base_final = final_name
        counter = 1
        while (
            f"{final_name}{suffix}" in existing_names or
            ((file_path.parent / f"{final_name}{suffix}").exists() and (file_path.parent / f"{final_name}{suffix}") != file_path)
        ):
            final_name = f"{base_final}{self.SEPARATOR}{counter}"
            counter += 1

        existing_names.add(f"{final_name}{suffix}")

        return file_path.with_name(f"{final_name}{suffix}")

    def _split_prefix_body(self, name: str) -> Tuple[str, str]:
        for pattern in self.PREFIX_PATTERNS:
            match = pattern.match(name)
            if match:
                prefix = match.group(0)
                body = name[len(prefix):]
                return prefix, body
        return "", name

    # -----------------------
    # EXTENSION LOGIC
    # -----------------------
    def _apply_extension(self, path: Path, seen: set) -> Path:
        original_name = path.name
        cleaned_name = self._clean_extension(path)
        final_name = self._apply_uniform(cleaned_name)
        final_name = self._resolve_collision(final_name, seen)
        seen.add(final_name.lower())
        if final_name != original_name:
            return path.with_name(final_name)
        return path

    def _clean_extension(self, path: Path) -> str:
        filename = path.name
        lower_name = filename.lower()

        for m_ext in self.MULTIPART_EXTENSIONS:
            if lower_name.endswith(m_ext):
                stem = filename[: -len(m_ext)]
                ext = m_ext.lower() if self.CLEAN_EXTENSIONS else m_ext
                return self._make_safe_filename(stem + ext)

        suffixes = path.suffixes
        if suffixes:
            final_ext = suffixes[-1].lower() if self.CLEAN_EXTENSIONS else suffixes[-1]
            if self.CLEAN_EXTENSIONS:
                while filename.lower().endswith(final_ext + final_ext):
                    filename = filename[: -(len(final_ext) * 2)] + final_ext
            return self._make_safe_filename(path.stem + final_ext)

        detected_ext = self._detect_mime_extension(path)
        return self._make_safe_filename(path.name + detected_ext)

    def _detect_mime_extension(self, path: Path) -> str:
        ext = ""
        if HAS_MAGIC:
            try:
                mime_type = magic.from_file(str(path), mime=True)
                ext = mimetypes.guess_extension(mime_type) or ""
            except Exception:
                pass
        else:
            ext = mimetypes.guess_extension(path.suffix.lower()) or ""

        if ext and self.CLEAN_EXTENSIONS:
            ext = ext.lower()

        return ext

    def _apply_uniform(self, filename: str) -> str:
        path = Path(filename)
        ext = path.suffix.lower()
        if self.UNIFORM_EXTENSIONS and ext in self.UNIFORM_MAPPING:
            ext = self.UNIFORM_MAPPING[ext]
        return f"{path.stem}{ext}"

    @staticmethod
    def _resolve_collision(name: str, seen: set) -> str:
        if name.lower() not in seen:
            return name
        p = Path(name)
        counter = 1
        while True:
            candidate = f"{p.stem}_{counter}{p.suffix}"
            if candidate.lower() not in seen:
                return candidate
            counter += 1

    @staticmethod
    def _make_safe_filename(name: str) -> str:
        name = re.sub(r'[<>:"/\\|?*\n\r\t]', "_", name)
        name = re.sub(r"\s+", " ", name).strip()
        return name


