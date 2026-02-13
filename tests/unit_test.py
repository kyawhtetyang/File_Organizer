import os
import sys
import tempfile
import time
from pathlib import Path
from types import SimpleNamespace
from datetime import datetime

from backend.src.core.models import Context, FileItem, ActionType
from backend.src.steps.filename import FilenameStep
from backend.src.steps.deduplicate import DeduplicateStep
from backend.src.steps.standardize import StandardizeStep
from backend.src.steps.group import GroupStep
from backend.src.steps.transfer import TransferStep
from backend.src.core.pipeline import Pipeline
from backend.src.core.undo_sqlite import UndoManagerSQLite


def make_config(**overrides):
    # Base config matching backend expectations
    cfg = SimpleNamespace(
        prefix=SimpleNamespace(add_timestamp=False),
        rename=SimpleNamespace(replace_bodyname="", append_first_text="", append_second_text=""),
        extension=SimpleNamespace(clean_extensions=True, uniform_extensions=True),
        timestamp_format=SimpleNamespace(preset="google_photos", hour_format_12=False),
        standardize=SimpleNamespace(use_filename_fallback=False),
        group=SimpleNamespace(prioritize_filename=True, structure="year_month"),
        transfer=SimpleNamespace(overwrite=False),
        deduplicate=SimpleNamespace(mode='safe'),
    )
    for k, v in overrides.items():
        setattr(cfg, k, v)
    return cfg


def assert_true(cond, msg):
    if not cond:
        raise AssertionError(msg)


def test_filename_step_basic():
    with tempfile.TemporaryDirectory() as td:
        p = Path(td)
        f = p / "IMG_0001.JPG"
        f.write_text("x")

        cfg = make_config(
            prefix=SimpleNamespace(add_timestamp=False),
            rename=SimpleNamespace(replace_bodyname="holiday", append_first_text="beach", append_second_text="2024"),
            extension=SimpleNamespace(clean_extensions=True, uniform_extensions=True),
        )
        ctx = Context(dry_run=True, source_root=p, target_root=p, config=cfg)
        item = FileItem(original_path=f, current_path=f)

        step = FilenameStep()
        step.process(ctx, [item])

        assert_true(item.current_path.name == "holiday_beach_2024.jpg", f"Unexpected name: {item.current_path.name}")


def test_filename_step_prefix_no_double():
    with tempfile.TemporaryDirectory() as td:
        p = Path(td)
        f = p / "2024-05-20_13-30-00.jpg"
        f.write_text("x")

        cfg = make_config(
            prefix=SimpleNamespace(add_timestamp=True),
            timestamp_format=SimpleNamespace(preset="google_photos", hour_format_12=False),
        )
        ctx = Context(dry_run=True, source_root=p, target_root=p, config=cfg)
        item = FileItem(original_path=f, current_path=f)

        step = FilenameStep()
        step.process(ctx, [item])

        assert_true(item.current_path.name == "2024-05-20_13-30-00.jpg", "Timestamp duplicated")


def test_filename_timeline_only():
    with tempfile.TemporaryDirectory() as td:
        p = Path(td)
        f = p / "filename.jpg"
        f.write_text("x")

        dt = datetime(1993, 7, 12, 4, 52, 24)
        os.utime(f, (time.mktime(dt.timetuple()), time.mktime(dt.timetuple())))

        cfg = make_config(
            prefix=SimpleNamespace(add_timestamp=True, timeline_mode="timeline_only"),
            timestamp_format=SimpleNamespace(preset="google_photos", hour_format_12=True),
            rename=SimpleNamespace(replace_bodyname="", append_first_text="", append_second_text=""),
            extension=SimpleNamespace(clean_extensions=False, uniform_extensions=False),
        )
        ctx = Context(dry_run=True, source_root=p, target_root=p, config=cfg)
        item = FileItem(original_path=f, current_path=f)

        step = FilenameStep()
        step.process(ctx, [item])

        assert_true(item.current_path.name == "1993-07-12_4-52-24AM.jpg", f"Unexpected name: {item.current_path.name}")


def test_filename_timeline_plus():
    with tempfile.TemporaryDirectory() as td:
        p = Path(td)
        f = p / "filename.jpg"
        f.write_text("x")

        dt = datetime(1993, 7, 12, 4, 52, 24)
        os.utime(f, (time.mktime(dt.timetuple()), time.mktime(dt.timetuple())))

        cfg = make_config(
            prefix=SimpleNamespace(add_timestamp=True, timeline_mode="timeline_plus"),
            timestamp_format=SimpleNamespace(preset="google_photos", hour_format_12=True),
            rename=SimpleNamespace(replace_bodyname="", append_first_text="", append_second_text=""),
            extension=SimpleNamespace(clean_extensions=False, uniform_extensions=False),
        )
        ctx = Context(dry_run=True, source_root=p, target_root=p, config=cfg)
        item = FileItem(original_path=f, current_path=f)

        step = FilenameStep()
        step.process(ctx, [item])

        assert_true(item.current_path.name == "1993-07-12_4-52-24AM_filename.jpg", f"Unexpected name: {item.current_path.name}")


def test_filename_uniform_extension_heic_to_jpg():
    with tempfile.TemporaryDirectory() as td:
        p = Path(td)
        f = p / "filename.HEIC"
        f.write_text("x")

        cfg = make_config(
            prefix=SimpleNamespace(add_timestamp=False),
            extension=SimpleNamespace(clean_extensions=True, uniform_extensions=True),
        )
        ctx = Context(dry_run=True, source_root=p, target_root=p, config=cfg)
        item = FileItem(original_path=f, current_path=f)

        step = FilenameStep()
        step.process(ctx, [item])

        assert_true(item.current_path.name == "filename.jpg", f"Unexpected name: {item.current_path.name}")


def test_filename_clean_extensions_removes_duplicates():
    with tempfile.TemporaryDirectory() as td:
        p = Path(td)
        f = p / "filename.jpg.jpg"
        f.write_text("x")

        cfg = make_config(
            prefix=SimpleNamespace(add_timestamp=False),
            extension=SimpleNamespace(clean_extensions=True, uniform_extensions=False),
        )
        ctx = Context(dry_run=True, source_root=p, target_root=p, config=cfg)
        item = FileItem(original_path=f, current_path=f)

        step = FilenameStep()
        step.process(ctx, [item])

        assert_true(item.current_path.name == "filename.jpg", f"Unexpected name: {item.current_path.name}")


def test_deduplicate_step():
    with tempfile.TemporaryDirectory() as td:
        p = Path(td)
        f1 = p / "photo.jpg"
        f2 = p / "photo (1).jpg"
        f1.write_text("same")
        f2.write_text("same")

        cfg = make_config(deduplicate=SimpleNamespace(mode='safe'))
        ctx = Context(dry_run=True, source_root=p, target_root=p, config=cfg)

        items = [FileItem(original_path=f1, current_path=f1), FileItem(original_path=f2, current_path=f2)]
        step = DeduplicateStep()
        out = step.process(ctx, items)

        deletes = [i for i in out if i.action == ActionType.DELETE]
        assert_true(len(deletes) == 1, f"Expected 1 delete, got {len(deletes)}")

        winner = [i for i in out if i.action != ActionType.DELETE][0]
        assert_true(winner.current_path.name == "photo.jpg", "Winner not canonical")


def test_standardize_step_dry_run():
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        folder = root / "2024-05-20 1-30-00PM"
        folder.mkdir()
        f1 = folder / "a.jpg"
        f2 = folder / "b.jpg"
        f1.write_text("x")
        f2.write_text("y")

        cfg = make_config(standardize=SimpleNamespace(use_filename_fallback=False))
        ctx = Context(dry_run=True, source_root=root, target_root=root, config=cfg)

        items = [FileItem(original_path=f1, current_path=f1), FileItem(original_path=f2, current_path=f2)]
        step = StandardizeStep()
        out = step.process(ctx, items)

        for i in out:
            assert_true(i.destination_path is not None, "Expected destination_path in dry run")
            assert_true(hasattr(i, "metadata_timestamp") and i.metadata_timestamp is not None, "Expected metadata_timestamp")

def test_standardize_file_fallback():
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        folder = root / "NotATimestamp"
        folder.mkdir()
        f1 = folder / "2021-02-06 12-00-00AM_000002.jpg"
        f2 = folder / "2013-02-06 12-00-00AM_000001.jpg"
        f3 = folder / "2023-02-06 12-00-00AM_000001.jpg"
        f1.write_text("x")
        f2.write_text("y")
        f3.write_text("z")

        cfg = make_config(
            standardize=SimpleNamespace(use_filename_fallback=True),
            timestamp_format=SimpleNamespace(preset="pcloud", hour_format_12=True),
        )
        ctx = Context(dry_run=True, source_root=root, target_root=root, config=cfg)

        items = [
            FileItem(original_path=f1, current_path=f1),
            FileItem(original_path=f2, current_path=f2),
            FileItem(original_path=f3, current_path=f3),
        ]
        step = StandardizeStep()
        out = step.process(ctx, items)

        names = [i.destination_path.name for i in out if i.destination_path]
        assert_true(any(n.startswith("2021-02-06 12-00-00AM_") for n in names), "Missing 2021 fallback")
        assert_true(any(n.startswith("2013-02-06 12-00-00AM_") for n in names), "Missing 2013 fallback")
        assert_true(any(n.startswith("2023-02-06 12-00-00AM_") for n in names), "Missing 2023 fallback")

def test_standardize_missing_source_folder():
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        missing_folder = root / "MissingFolder"
        f1 = missing_folder / "file.jpg"

        cfg = make_config(standardize=SimpleNamespace(use_filename_fallback=False))
        ctx = Context(dry_run=True, source_root=root, target_root=root, config=cfg)

        item = FileItem(original_path=f1, current_path=f1)
        step = StandardizeStep()
        out = step.process(ctx, [item])

        # Should not crash; if metadata missing, fallback should still assign destination_path
        for i in out:
            assert_true(i.destination_path is not None, "Expected destination_path even if source folder missing")


def test_group_step():
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        f = root / "2024-05-20_13-30-00.jpg"
        f.write_text("x")

        cfg = make_config(group=SimpleNamespace(prioritize_filename=True, structure="year_month"))
        ctx = Context(dry_run=True, source_root=root, target_root=root, config=cfg)

        item = FileItem(original_path=f, current_path=f)
        step = GroupStep()
        step.process(ctx, [item])

        expected = root / "2024" / "05" / f.name
        assert_true(item.destination_path == expected, f"Unexpected group path: {item.destination_path}")

def test_group_step_metadata_fallback():
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        f = root / "no-date-name.jpg"
        f.write_text("x")

        cfg = make_config(group=SimpleNamespace(prioritize_filename=False, structure="year_month"))
        ctx = Context(dry_run=True, source_root=root, target_root=root, config=cfg)

        item = FileItem(original_path=f, current_path=f)
        # inject metadata timestamp to simulate EXIF
        item.metadata["timestamp"] = datetime(1993, 7, 12, 4, 52, 24)

        step = GroupStep()
        step.process(ctx, [item])

        expected = root / "1993" / "07" / f.name
        assert_true(item.destination_path == expected, f"Unexpected group path: {item.destination_path}")


def test_transfer_step():
    with tempfile.TemporaryDirectory() as td:
        root = Path(td) / "src"
        target = Path(td) / "dst"
        root.mkdir()
        target.mkdir()
        f = root / "file.jpg"
        f.write_text("x")

        cfg = make_config(transfer=SimpleNamespace(overwrite=False))
        ctx = Context(dry_run=True, source_root=root, target_root=target, config=cfg)

        item = FileItem(original_path=f, current_path=f)
        step = TransferStep()
        step.process(ctx, [item])

        expected = target / "file.jpg"
    assert_true(item.destination_path == expected, f"Unexpected transfer path: {item.destination_path}")


def test_undo_delete():
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        f = root / "to_delete.jpg"
        f.write_text("x")

        cfg = make_config()
        ctx = Context(dry_run=False, source_root=root, target_root=root, config=cfg)

        item = FileItem(original_path=f, current_path=f)
        item.mark_delete()

        pipeline = Pipeline(ctx)
        pipeline._execute_changes([item])

        # Ensure file moved to trash
        assert_true(item.destination_path is not None, "Expected trash destination for delete")
        assert_true(not f.exists(), "Expected original deleted")
        assert_true(item.destination_path.exists(), "Expected file in trash")

        db_path = root / "undo.db"
        undo = UndoManagerSQLite(db_path=db_path)
        undo.save_operation("test_delete", [{
            "original": str(item.original_path),
            "new": str(item.destination_path),
            "action": "DELETE"
        }])

        result = undo.undo_last_operation()
        assert_true(result["success"], "Undo delete failed")
        assert_true(f.exists(), "Expected restored file")


def run_all():
    tests = [
        test_filename_step_basic,
        test_filename_step_prefix_no_double,
        test_deduplicate_step,
        test_standardize_step_dry_run,
        test_standardize_file_fallback,
        test_group_step,
        test_transfer_step,
        test_undo_delete,
    ]
    for t in tests:
        t()
        print(f"PASS: {t.__name__}")


if __name__ == "__main__":
    run_all()
    print("ALL TESTS PASSED")





