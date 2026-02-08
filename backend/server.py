# server.py
import sys
from pathlib import Path

# Add src to sys.path if needed, or rely on CWD
if str(Path(__file__).parent) not in sys.path:
    sys.path.append(str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json
from datetime import datetime
import re
from typing import List, Optional
from enum import Enum
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os

# Backend imports
from src.core.models import Context, FileItem, ActionType
from src.core.pipeline import Pipeline
from src.core.scanner import Scanner
from src.core.undo_sqlite import UndoManagerSQLite
from src.core.preset_overrides_sqlite import PresetOverridesSQLite
from src.core.custom_presets_sqlite import CustomPresetsSQLite
from src.steps.deduplicate import DeduplicateStep
from src.steps.group import GroupStep
from src.steps.transfer import TransferStep
from src.steps.standardize import StandardizeStep
from src.steps.filename import FilenameStep

app = FastAPI(title="File Organizer Backend API")

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize undo manager with SQLite
undo_db_path = Path(__file__).parent / "undo_history.db"
undo_manager = UndoManagerSQLite(db_path=undo_db_path)
presets_db_path = Path(__file__).parent / "preset_overrides.db"
preset_overrides = PresetOverridesSQLite(db_path=presets_db_path)
custom_presets = CustomPresetsSQLite(db_path=presets_db_path)

class StepId(str, Enum):
    STANDARDIZE = 'standardize'
    DEDUPLICATE = 'deduplicate'
    FILENAME = 'filename'
    PREFIX = 'prefix'
    RENAME = 'rename'
    CLEAN_EXTENSION = 'clean_extension'
    GROUP = 'group'
    TRANSFER = 'transfer'

# ... (Config models - generic is fine for now)

# ...

# Map StepId to Backend Step Classes
STEP_CLASS_MAP = {
    StepId.STANDARDIZE: StandardizeStep,
    StepId.DEDUPLICATE: DeduplicateStep,
    StepId.FILENAME: FilenameStep,
    StepId.GROUP: GroupStep,
    StepId.TRANSFER: TransferStep
}

class MetadataConfig(BaseModel):
    start_datetime: str = "1993-01-12 00:00:00"
    add_timestamp: Optional[bool] = True
    keep_original_name: Optional[bool] = False



class DeduplicateConfig(BaseModel):
    faster_process: bool = True

class PrefixConfig(BaseModel):
    add_timestamp: bool = True
    # hour_format_12 moved to TimestampFormatConfig
    timeline_mode: Optional[str] = None  # "off" | "timeline_only" | "timeline_plus"

    def validate(self):
        if self.timeline_mode is not None and self.timeline_mode not in {"off", "timeline_only", "timeline_plus"}:
            raise ValueError("timeline_mode must be one of: off, timeline_only, timeline_plus")

class RenameConfig(BaseModel):
    replace_bodyname: Optional[str] = ""
    append_first_text: Optional[str] = ""
    append_second_text: Optional[str] = ""

class ExtensionConfig(BaseModel):
    clean_extensions: bool = True
    uniform_extensions: bool = True

class TimestampFormatConfig(BaseModel):
    preset: str = "pcloud"  # Options: "pcloud", "google_photos", "default"
    hour_format_12: bool = True

    def validate(self):
        if self.preset not in {"pcloud", "google_photos", "default"}:
            raise ValueError("timestamp_format.preset must be one of: pcloud, google_photos, default")

class StandardizeConfig(BaseModel):
    use_filename_fallback: bool = False

class GroupConfig(BaseModel):
    prioritize_filename: bool = True

class TransferConfig(BaseModel):
    overwrite: bool = False

class PipelineConfig(BaseModel):
    sourceDir: str
    targetDir: str
    isDryRun: bool
    fileCategory: str = 'all'
    timestamp_format: TimestampFormatConfig = TimestampFormatConfig()
    standardize: StandardizeConfig = StandardizeConfig()
    metadata: MetadataConfig = MetadataConfig()
    deduplicate: DeduplicateConfig = DeduplicateConfig()
    prefix: PrefixConfig = PrefixConfig()
    extension: ExtensionConfig = ExtensionConfig()
    rename: RenameConfig = RenameConfig()
    group: GroupConfig = GroupConfig()
    transfer: TransferConfig = TransferConfig()

    def validate(self):
        if not isinstance(self.sourceDir, str) or not self.sourceDir:
            raise ValueError("sourceDir must be a non-empty string")
        if not isinstance(self.targetDir, str) or not self.targetDir:
            raise ValueError("targetDir must be a non-empty string")
        if self.fileCategory not in {"all", "docs", "photos", "audio", "video", "code", "others"}:
            raise ValueError("fileCategory must be one of: all, docs, photos, audio, video, code, others")
        self.prefix.validate()
        self.timestamp_format.validate()

class FileChange(BaseModel):
    original: str
    new: str
    status: str
    message: Optional[str] = None

class RunStepRequest(BaseModel):
    step_id: StepId
    config: PipelineConfig

class RunAllRequest(BaseModel):
    steps: List[StepId]
    config: PipelineConfig

class ScanPathRequest(BaseModel):
    path: str
    limit: Optional[int] = None

class ScanPathResponse(BaseModel):
    count: int
    exists: bool
    truncated: bool = False
    error: Optional[str] = None

class CreatePathRequest(BaseModel):
    path: str

class StepResponse(BaseModel):
    step_id: StepId
    success: bool
    processed_files: List[FileChange]
    error: Optional[str] = None

class PresetOverrideRequest(BaseModel):
    preset_key: str
    source: str
    target: str

class CustomPresetRequest(BaseModel):
    name: str
    source: str
    target: str

class ClientErrorLogRequest(BaseModel):
    message: str
    stack: Optional[str] = None
    source: Optional[str] = None
    url: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: Optional[str] = None

def _scrub_text(value: Optional[str]) -> Optional[str]:
    if not value:
        return value
    # Remove query params from URLs
    value = re.sub(r"(https?://[^\\s]+?)\\?[^\\s]+", r"\\1", value)
    # Mask user home paths
    value = re.sub(r"/Users/[^/\\s]+", "/Users/***", value)
    value = re.sub(r"C:\\\\Users\\\\[^\\\\\\s]+", r"C:\\\\Users\\\\***", value)
    # Mask emails
    value = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}", "***@***", value)
    # Mask long tokens (basic heuristic)
    value = re.sub(r"\\b[A-Za-z0-9_-]{24,}\\b", "***", value)
    return value

def _rotate_log(log_path: Path, max_bytes: int = 5 * 1024 * 1024, keep: int = 3) -> None:
    if not log_path.exists():
        return
    if log_path.stat().st_size <= max_bytes:
        return

    # Remove oldest
    oldest = log_path.with_suffix(log_path.suffix + f".{keep - 1}")
    if oldest.exists():
        oldest.unlink()

    # Shift
    for i in range(keep - 2, 0, -1):
        src = log_path.with_suffix(log_path.suffix + f".{i}")
        dst = log_path.with_suffix(log_path.suffix + f".{i + 1}")
        if src.exists():
            src.replace(dst)

    # Rotate current to .1
    log_path.replace(log_path.with_suffix(log_path.suffix + ".1"))



def generate_changes(processed_items: List[FileItem], target_root: Path, source_root: Path) -> List[FileChange]:
    changes = []
    for item in processed_items:
        original_name = item.original_path.name
        new_val = ""
        status = "success"

        # Special handling for Metadata Step
        if hasattr(item, 'metadata_timestamp') and item.metadata_timestamp and item.action == ActionType.NONE:
             new_val = f"Metadata Updated: {item.metadata_timestamp}"
             changes.append(FileChange(
                original=original_name,
                new=new_val,
                status=status
             ))
             continue

        if item.action == ActionType.NONE:
            continue

        if item.action == ActionType.DELETE:
            new_val = "deleted"

        elif item.action == ActionType.RENAME:
            if item.destination_path:
                new_val = item.destination_path.name
            else:
                new_val = "unknown"

        elif item.action == ActionType.MOVE:
            if item.destination_path:
                try:
                    if item.destination_path.is_relative_to(target_root):
                        new_val = str(item.destination_path.relative_to(target_root))
                    elif item.destination_path.is_relative_to(source_root):
                        new_val = str(item.destination_path.relative_to(source_root))
                    else:
                        new_val = str(item.destination_path)
                except (ValueError, AttributeError):
                    new_val = str(item.destination_path)
            else:
                new_val = "unknown"

        changes.append(FileChange(
            original=original_name,
            new=new_val,
            status=status
        ))
    return changes

def run_step_logic(step_id: StepId, config: PipelineConfig, initial_items: List[FileItem] = None, record_undo: bool = True):
    # 1. Setup Context
    source_root = Path(config.sourceDir)
    target_root = Path(config.targetDir)

    context = Context(
        dry_run=config.isDryRun,
        source_root=source_root,
        target_root=target_root,
        config=config
    )

    # 2. Get Files (Scan or Reuse)
    if initial_items is not None:
        items = initial_items
        # Reset per-step action state so each step records only its own changes
        for item in items:
            item.action = ActionType.NONE
            item.destination_path = None
    else:
        items = Scanner.scan(source_root, config.fileCategory)

    # 3. Initialize Step
    StepClass = STEP_CLASS_MAP.get(step_id)
    if not StepClass:
        raise ValueError(f"No handler for step {step_id}")

    step = StepClass()

    # 4. Process (Plan)
    processed_items = step.process(context, items)

    # 5. Execute (if not dry run)
    print(f"🔍 Dry Run Status: {config.isDryRun} (isDryRun={config.isDryRun})")
    if not config.isDryRun:
        print("✅ Executing changes (NOT dry run)")

        # Capture undo changes BEFORE executing to preserve original paths
        undo_changes = []
        for item in processed_items:
            if item.action in (ActionType.RENAME, ActionType.MOVE) and item.destination_path:
                undo_changes.append({
                    "original": str(item.original_path),
                    "new": str(item.destination_path),
                    "action": item.action.name
                })

        pipeline = Pipeline(context)
        pipeline._execute_changes(processed_items)

        # Handle DELETE undo after execution (trash path is set during execution)
        for item in processed_items:
            if item.action == ActionType.DELETE and item.destination_path:
                undo_changes.append({
                    "original": str(item.original_path),
                    "new": str(item.destination_path),
                    "action": item.action.name
                })

        # Update items for downstream steps and drop deleted items
        updated_items = []
        for item in processed_items:
            if item.action == ActionType.DELETE:
                continue
            if item.action in (ActionType.RENAME, ActionType.MOVE) and item.destination_path:
                item.original_path = item.destination_path
                item.current_path = item.destination_path
            updated_items.append(item)
        processed_items = updated_items

        # Save to undo history (optional for batch runs)
        if record_undo:
            if undo_changes:
                import uuid
                operation_id = f"{step_id.value}_{uuid.uuid4().hex[:8]}"
                print(f"📝 Saving {len(undo_changes)} changes to undo database (ID: {operation_id})")
                undo_manager.save_operation(operation_id, undo_changes)
                print(f"✅ Undo history saved to SQLite: {undo_manager.db_path}")
            else:
                print("⚠️  No changes to track for undo")

        # 5b. Cleanup
        step.cleanup(context)

    # 6. Generate Report
    print(f"Processed {len(processed_items)} items.")
    changes = generate_changes(processed_items, target_root, source_root)

    return processed_items, changes, (undo_changes if not config.isDryRun else [])

@app.post("/api/run-step", response_model=StepResponse)
async def api_run_step(request: RunStepRequest):
    try:
        request.config.validate()
        # Validate existence if not dry run (or even if dry run, source must exist to scan)
        print(f"🔴 Processing Step: {request.step_id} | Dry Run: {request.config.isDryRun}")


        if not os.path.exists(request.config.sourceDir):
             # Auto-create if it looks like a placeholder path (contains #)
             if "#" in request.config.sourceDir:
                 try:
                     os.makedirs(request.config.sourceDir, exist_ok=True)
                     print(f"Auto-created source directory: {request.config.sourceDir}")
                 except Exception as e:
                     return StepResponse(step_id=request.step_id, success=False, processed_files=[], error=f"Could not create source directory: {str(e)}")
             else:
                 return StepResponse(step_id=request.step_id, success=False, processed_files=[], error=f"Source directory not found: {request.config.sourceDir}")

        results, changes, _ = run_step_logic(request.step_id, request.config)
        return StepResponse(step_id=request.step_id, success=True, processed_files=changes)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return StepResponse(step_id=request.step_id, success=False, processed_files=[], error=str(e))

@app.post("/api/run-all", response_model=List[StepResponse])
async def api_run_all(request: RunAllRequest):
    all_results = []
    combined_undo = []

    # Run sequentially
    try:
        request.config.validate()
        # 1. Initial Scan Validation
        if not os.path.exists(request.config.sourceDir):
             # Auto-create if it looks like a placeholder path (contains #)
             if "#" in request.config.sourceDir:
                 try:
                     os.makedirs(request.config.sourceDir, exist_ok=True)
                     print(f"Auto-created source directory: {request.config.sourceDir}")
                 except Exception:
                     return []
             else:
                 return []

    # 2. Initial Scan (Once)
        current_items = Scanner.scan(Path(request.config.sourceDir), request.config.fileCategory)

        # 3. Loop Steps
        for step_id in request.steps:
            try:
                # Pass current_items to next step, receive modified items back
                current_items, changes, undo_changes = run_step_logic(
                    step_id,
                    request.config,
                    initial_items=current_items,
                    record_undo=False
                )
                all_results.append(StepResponse(step_id=step_id, success=True, processed_files=changes))
                if not request.config.isDryRun and undo_changes:
                    combined_undo.extend(undo_changes)
            except Exception as e:
                import traceback
                traceback.print_exc()
                all_results.append(StepResponse(step_id=step_id, success=False, processed_files=[], error=str(e)))

    except Exception:
        # Fallback
        pass

    # Save combined undo as a single summary operation
    if not request.config.isDryRun and combined_undo:
        import uuid
        operation_id = f"summary_{uuid.uuid4().hex[:8]}"
        print(f"📝 Saving {len(combined_undo)} changes to undo database (ID: {operation_id})")
        undo_manager.save_operation(operation_id, combined_undo)
        print(f"✅ Undo history saved to SQLite: {undo_manager.db_path}")

    return all_results

@app.post("/api/scan-path", response_model=ScanPathResponse)
async def api_scan_path(request: ScanPathRequest):
    try:
        p = Path(request.path)
        if not p.exists():
            return ScanPathResponse(count=0, exists=False, error="Path does not exist")

        # Fast count with optional limit for quicker UI updates
        count, truncated = Scanner.scan_count(p, 'all', request.limit)
        return ScanPathResponse(count=count, exists=True, truncated=truncated)
    except Exception as e:
        return ScanPathResponse(count=0, exists=True, error=str(e))

@app.post("/api/create-path")
async def api_create_path(request: CreatePathRequest):
    if not request.path or not isinstance(request.path, str):
        raise HTTPException(status_code=400, detail="Path must be a non-empty string")
    try:
        os.makedirs(request.path, exist_ok=True)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/defaults")
def get_defaults():
    home = Path.home()
    return {
        "home": str(home),
        "desktop": str(home / "Desktop"),
        "downloads": str(home / "Downloads")
    }

@app.get("/api/debug/undo")
async def api_debug_undo():
    """Debug endpoint to check undo manager status."""
    stats = undo_manager.get_stats()
    return {
        "db_path": stats["db_path"],
        "db_size_bytes": stats["db_size_bytes"],
        "operation_count": stats["operation_count"],
        "change_count": stats["change_count"],
        "history": undo_manager.get_history()
    }

@app.post("/api/undo")
async def api_undo():
    """Undo the last file operation."""
    try:
        result = undo_manager.undo_last_operation()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/undo/{operation_id}")
async def api_undo_operation(operation_id: str):
    """Undo a specific operation (latest only)."""
    try:
        result = undo_manager.undo_operation(operation_id, require_latest=True)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/undo/history")
async def api_undo_history():
    """Get undo operation history."""
    try:
        history = undo_manager.get_history()
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/undo/clear")
async def api_undo_clear():
    """Clear all undo history."""
    try:
        undo_manager.clear_history()
        return {"success": True, "message": "Undo history cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/preset-overrides")
async def api_get_preset_overrides():
    return {"overrides": preset_overrides.get_all()}

@app.post("/api/preset-overrides")
async def api_set_preset_overrides(request: PresetOverrideRequest):
    preset_overrides.upsert(request.preset_key, request.source, request.target)
    return {"success": True}

@app.get("/api/custom-presets")
async def api_get_custom_presets():
    return {"presets": custom_presets.list_all()}

@app.post("/api/custom-presets")
async def api_create_custom_preset(request: CustomPresetRequest):
    preset = custom_presets.create(request.name, request.source, request.target)
    return {"success": True, "preset": preset}

@app.delete("/api/custom-presets/{preset_id}")
async def api_delete_custom_preset(preset_id: int):
    custom_presets.delete(preset_id)
    return {"success": True}

@app.post("/api/log-client-error")
async def api_log_client_error(request: ClientErrorLogRequest):
    try:
        log_dir = Path(__file__).parent / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_path = log_dir / "client_errors.log"

        _rotate_log(log_path)

        payload = request.dict()
        payload["message"] = _scrub_text(payload.get("message"))
        payload["stack"] = _scrub_text(payload.get("stack"))
        payload["source"] = _scrub_text(payload.get("source"))
        payload["url"] = _scrub_text(payload.get("url"))
        payload["user_agent"] = _scrub_text(payload.get("user_agent"))
        if not payload.get("timestamp"):
            payload["timestamp"] = datetime.utcnow().isoformat() + "Z"

        with log_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload) + "\n")

        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)


