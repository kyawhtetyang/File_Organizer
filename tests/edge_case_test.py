import os
from pathlib import Path
from types import SimpleNamespace
from backend.server import run_step_logic, StepId, PipelineConfig, TimestampFormatConfig, StandardizeConfig, DeduplicateConfig, PrefixConfig, RenameConfig, ExtensionConfig, GroupConfig, TransferConfig
from backend.src.core.scanner import Scanner


def make_config(source: Path, target: Path, dry_run: bool = True):
    return PipelineConfig(
        sourceDir=str(source),
        targetDir=str(target),
        isDryRun=dry_run,
        fileCategory='all',
        timestamp_format=TimestampFormatConfig(preset='pcloud', hour_format_12=True),
        standardize=StandardizeConfig(use_filename_fallback=True),
        deduplicate=DeduplicateConfig(faster_process=True),
        prefix=PrefixConfig(add_timestamp=True),
        rename=RenameConfig(replace_bodyname='', append_first_text='edge', append_second_text='case'),
        extension=ExtensionConfig(clean_extensions=True, uniform_extensions=True),
        group=GroupConfig(prioritize_filename=True),
        transfer=TransferConfig(overwrite=False),
    )


def create_edge_files(root: Path):
    root.mkdir(parents=True, exist_ok=True)
    files = [
        "photo.jpg",
        "photo (1).jpg",
        "Copy of photo.jpg",
        "weird..name..jpg.jpg",
        "NOEXT",
        "UPPER.JPEG",
        "2024-05-20 1-30-00PM_000001.JPG",
        "2024-05-20_13-30-00_file.png",
        "2024-05-20 13-30-00 file.txt",
        "(1) list.md",
        "[2]_list.md",
        "3._list.md",
        "emoji_😀.txt",
        "space   name   here.txt",
        "multi.part.name.tar.gz",
        "duplicate.jpg",
        "duplicate.JPG",
        "2023-02-06 12-00-00AM_000001.jpg",
        "2021-02-06 12-00-00AM_000002.jpg",
        "2013-02-06 12-00-00AM_000001.jpg",
    ]

    for name in files:
        path = root / name
        path.write_text(f"edge case file: {name}")


def run_edge_cases():
    base = Path("/tmp/file_organizer_edge_cases")
    source = base / "input"
    target = base / "output"

    if source.exists():
        for p in source.rglob("*"):
            if p.is_file():
                p.unlink()
        for p in sorted(source.rglob("*"), reverse=True):
            if p.is_dir():
                try:
                    p.rmdir()
                except Exception:
                    pass
    if target.exists():
        for p in target.rglob("*"):
            if p.is_file():
                p.unlink()
        for p in sorted(target.rglob("*"), reverse=True):
            if p.is_dir():
                try:
                    p.rmdir()
                except Exception:
                    pass

    create_edge_files(source)

    cfg = make_config(source, target, dry_run=True)
    steps = [StepId.STANDARDIZE, StepId.DEDUPLICATE, StepId.FILENAME, StepId.GROUP, StepId.TRANSFER]

    items = Scanner.scan(source, cfg.fileCategory)
    print(f"EDGE: scanned {len(items)} files")

    for step_id in steps:
        items, changes, _ = run_step_logic(step_id, cfg, initial_items=items, record_undo=False)
        print(f"EDGE: {step_id.value} changes={len(changes)}")

    print("EDGE CASE TEST COMPLETE")


if __name__ == "__main__":
    run_edge_cases()





