import os
import tempfile
import time
import unittest
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from backend.src.core.models import ActionType, Context, FileItem
from backend.src.core.pipeline import Pipeline
from backend.src.core.scanner import Scanner
from backend.src.core.custom_presets_sqlite import CustomPresetsSQLite
from backend.src.core.preset_overrides_sqlite import PresetOverridesSQLite
from backend.src.core.undo_sqlite import UndoManagerSQLite
from backend.src.steps.deduplicate import DeduplicateStep
from backend.src.steps.filename import FilenameStep
from backend.src.steps.group import GroupStep
from backend.src.steps.standardize import StandardizeStep
from backend.src.steps.transfer import TransferStep
from backend.src.utils.timestamp_formatter import TimestampFormatter


def make_config(**overrides):
    cfg = SimpleNamespace(
        prefix=SimpleNamespace(add_timestamp=False, timeline_mode="off"),
        rename=SimpleNamespace(replace_bodyname="", append_first_text="", append_second_text=""),
        extension=SimpleNamespace(clean_extensions=True, uniform_extensions=True),
        timestamp_format=SimpleNamespace(preset="pcloud", hour_format_12=True),
        standardize=SimpleNamespace(use_filename_fallback=False),
        group=SimpleNamespace(prioritize_filename=True, structure="year_month"),
        transfer=SimpleNamespace(overwrite=False, cleanup_hidden_files=False),
        deduplicate=SimpleNamespace(faster_process=True),
    )
    for k, v in overrides.items():
        setattr(cfg, k, v)
    return cfg


class TestTimestampFormatter(unittest.TestCase):
    def test_pcloud_has_microseconds(self):
        dt = datetime(2024, 1, 1, 14, 30, 45, 123456)
        out = TimestampFormatter("pcloud").format(dt)
        self.assertEqual(out, "2024-01-01 2-30-45PM_123456")

    def test_google_photos_24h(self):
        dt = datetime(2024, 1, 1, 14, 30, 45, 123456)
        out = TimestampFormatter("google_photos").format(dt)
        self.assertEqual(out, "2024-01-01_14-30-45")

    def test_global_override_12h(self):
        dt = datetime(2024, 1, 1, 14, 30, 45)
        out = TimestampFormatter("google_photos", global_12h_format=True).format(dt)
        self.assertEqual(out, "2024-01-01_2-30-45PM")


class TestCoreModelsAndPipeline(unittest.TestCase):
    def test_fileitem_markers(self):
        p = Path("/tmp/a.txt")
        item = FileItem(original_path=p, current_path=p)
        item.mark_rename("b.txt")
        self.assertEqual(item.action, ActionType.RENAME)
        self.assertEqual(item.current_path.name, "b.txt")
        item.mark_move(Path("/tmp/c"))
        self.assertEqual(item.action, ActionType.MOVE)
        self.assertEqual(item.destination_path, Path("/tmp/c") / "b.txt")

    def test_pipeline_execute_rename_and_delete(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            src = root / "src"
            src.mkdir()
            f_keep = src / "a.txt"
            f_del = src / "b.txt"
            f_keep.write_text("a")
            f_del.write_text("b")

            cfg = make_config()
            ctx = Context(dry_run=False, source_root=src, target_root=src, config=cfg)
            pipeline = Pipeline(ctx)

            i_keep = FileItem(original_path=f_keep, current_path=f_keep)
            i_keep.mark_rename("renamed.txt")

            i_del = FileItem(original_path=f_del, current_path=f_del)
            i_del.mark_delete()

            pipeline._execute_changes([i_keep, i_del])

            self.assertTrue((src / "renamed.txt").exists())
            self.assertFalse(f_del.exists())
            self.assertTrue((src / ".undo_trash" / "b.txt").exists())


class TestScanner(unittest.TestCase):
    def test_scan_category_and_limit(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            (root / "a.jpg").write_text("x")
            (root / "b.png").write_text("x")
            (root / "c.mp4").write_text("x")
            (root / ".hidden.jpg").write_text("x")

            photos = Scanner.scan(root, "photos", limit=1)
            self.assertEqual(len(photos), 1)
            self.assertIn(photos[0].suffix.lower(), {".jpg", ".png"})

    def test_scan_count_truncated(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            for i in range(5):
                (root / f"{i}.txt").write_text("x")
            count, truncated = Scanner.scan_count(root, "all", limit=3)
            self.assertEqual(count, 3)
            self.assertTrue(truncated)


class TestFilenameStep(unittest.TestCase):
    def test_timeline_off_no_rename(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            f = root / "2025-08-07 9-24-43 AM.mov"
            f.write_text("x")
            cfg = make_config(
                prefix=SimpleNamespace(add_timestamp=False, timeline_mode="off"),
                extension=SimpleNamespace(clean_extensions=False, uniform_extensions=False),
            )
            ctx = Context(dry_run=True, source_root=root, target_root=root, config=cfg)
            item = FileItem(original_path=f, current_path=f)
            FilenameStep().process(ctx, [item])
            self.assertEqual(item.current_path.name, f.name)

    def test_timeline_only_uses_mtime_when_no_filename_match(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            f = root / "file.jpg"
            f.write_text("x")
            dt = datetime(2026, 2, 10, 13, 30, 24)
            ts = time.mktime(dt.timetuple())
            os.utime(f, (ts, ts))

            cfg = make_config(
                prefix=SimpleNamespace(add_timestamp=True, timeline_mode="timeline_only"),
                timestamp_format=SimpleNamespace(preset="pcloud", hour_format_12=True),
                extension=SimpleNamespace(clean_extensions=False, uniform_extensions=False),
            )
            ctx = Context(dry_run=True, source_root=root, target_root=root, config=cfg)
            item = FileItem(original_path=f, current_path=f)
            FilenameStep().process(ctx, [item])
            self.assertEqual(item.current_path.name, "2026-02-10 1-30-24PM.jpg")

    def test_clean_duplicate_extension(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            f = root / "x.mov.mov"
            f.write_text("x")
            cfg = make_config(
                extension=SimpleNamespace(clean_extensions=True, uniform_extensions=False),
                prefix=SimpleNamespace(add_timestamp=False, timeline_mode="off"),
            )
            ctx = Context(dry_run=True, source_root=root, target_root=root, config=cfg)
            item = FileItem(original_path=f, current_path=f)
            FilenameStep().process(ctx, [item])
            self.assertEqual(item.current_path.name, "x.mov")


class TestDeduplicateStep(unittest.TestCase):
    def test_marks_one_duplicate_for_delete(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            a = root / "photo.jpg"
            b = root / "photo (1).jpg"
            a.write_text("a")
            b.write_text("b")
            items = [FileItem(a, a), FileItem(b, b)]
            out = DeduplicateStep().process(Context(True, root, root, make_config()), items)
            deletes = [i for i in out if i.action == ActionType.DELETE]
            self.assertEqual(len(deletes), 1)

    def test_respects_faster_process_toggle(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            a = root / "photo.jpg"
            b = root / "photo (1).jpg"
            a.write_text("a")
            b.write_text("b")
            items = [FileItem(a, a), FileItem(b, b)]

            fast_cfg = make_config(deduplicate=SimpleNamespace(faster_process=True))
            with patch("backend.src.steps.deduplicate.file_hash") as hash_mock:
                DeduplicateStep().process(Context(True, root, root, fast_cfg), items)
                self.assertFalse(hash_mock.called)

            slow_cfg = make_config(deduplicate=SimpleNamespace(faster_process=False))
            with patch("backend.src.steps.deduplicate.file_hash", return_value="h") as hash_mock:
                DeduplicateStep().process(Context(True, root, root, slow_cfg), items)
                self.assertTrue(hash_mock.called)


class TestStandardizeStep(unittest.TestCase):
    def test_folder_timestamp_generates_destination(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            folder = root / "2024-05-20 1-30-00PM"
            folder.mkdir()
            f = folder / "a.jpg"
            f.write_text("x")
            item = FileItem(f, f)
            cfg = make_config(timestamp_format=SimpleNamespace(preset="google_photos", hour_format_12=False))
            out = StandardizeStep().process(Context(True, root, root, cfg), [item])
            self.assertEqual(len(out), 1)
            self.assertIsNotNone(out[0].destination_path)
            self.assertTrue(out[0].destination_path.name.startswith("2024-05-20_13-30-00"))

    def test_filename_fallback_when_folder_invalid(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            folder = root / "NoTime"
            folder.mkdir()
            f = folder / "2023-02-06 12-00-00AM_000001.jpg"
            f.write_text("x")
            item = FileItem(f, f)
            cfg = make_config(standardize=SimpleNamespace(use_filename_fallback=True))
            out = StandardizeStep().process(Context(True, root, root, cfg), [item])
            self.assertIsNotNone(out[0].destination_path)
            self.assertIn("2023-02-06", out[0].destination_path.name)


class TestGroupStep(unittest.TestCase):
    def test_group_by_filename(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            f = root / "2024-05-20_13-30-00.jpg"
            f.write_text("x")
            item = FileItem(f, f)
            cfg = make_config(group=SimpleNamespace(prioritize_filename=True, structure="year_month"))
            out = GroupStep().process(Context(True, root, root, cfg), [item])
            self.assertEqual(out[0].destination_path, root / "2024" / "05" / f.name)

    def test_group_uses_metadata_fallback(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            f = root / "nodate.jpg"
            f.write_text("x")
            dt = datetime(1993, 7, 12, 4, 52, 24)
            ts = time.mktime(dt.timetuple())
            os.utime(f, (ts, ts))
            item = FileItem(f, f)
            cfg = make_config(group=SimpleNamespace(prioritize_filename=False, structure="year_month"))
            out = GroupStep().process(Context(True, root, root, cfg), [item])
            self.assertEqual(out[0].destination_path, root / "1993" / "07" / f.name)


class TestTransferStep(unittest.TestCase):
    def test_transfer_preserves_relative_path(self):
        with tempfile.TemporaryDirectory() as td:
            base = Path(td)
            source = base / "src"
            target = base / "dst"
            source.mkdir()
            target.mkdir()
            file_path = source / "2024" / "05" / "a.jpg"
            file_path.parent.mkdir(parents=True)
            file_path.write_text("x")
            item = FileItem(file_path, file_path)
            item.mark_move(source / "2024" / "05")
            out = TransferStep().process(Context(True, source, target, make_config()), [item])
            self.assertEqual(out[0].destination_path, target / "2024" / "05" / "a.jpg")

    def test_cleanup_removes_empty_parents_and_junk(self):
        with tempfile.TemporaryDirectory() as td:
            source = Path(td) / "src"
            year = source / "2024"
            month = year / "05"
            month.mkdir(parents=True)
            (month / ".DS_Store").write_text("x")
            TransferStep().cleanup(Context(False, source, source, make_config()))
            # Safe default: hidden/junk files are preserved, so folders remain.
            self.assertTrue(month.exists())
            self.assertTrue(year.exists())

    def test_cleanup_hidden_files_toggle(self):
        with tempfile.TemporaryDirectory() as td:
            source = Path(td) / "src"
            year = source / "2024"
            month = year / "05"
            month.mkdir(parents=True)
            (month / ".keep").write_text("x")

            cfg_keep_hidden = make_config(
                transfer=SimpleNamespace(overwrite=False, cleanup_hidden_files=False)
            )
            TransferStep().cleanup(Context(False, source, source, cfg_keep_hidden))
            self.assertTrue(month.exists())

            cfg_remove_hidden = make_config(
                transfer=SimpleNamespace(overwrite=False, cleanup_hidden_files=True)
            )
            TransferStep().cleanup(Context(False, source, source, cfg_remove_hidden))
            self.assertFalse(month.exists())
            self.assertFalse(year.exists())


class TestSQLiteManagers(unittest.TestCase):
    def test_preset_overrides_upsert(self):
        with tempfile.TemporaryDirectory() as td:
            db = Path(td) / "preset.db"
            store = PresetOverridesSQLite(db)
            store.upsert("default", "/a", "/b")
            store.upsert("default", "/c", "/d")
            all_data = store.get_all()
            self.assertEqual(all_data["default"]["source"], "/c")
            self.assertEqual(all_data["default"]["target"], "/d")

    def test_custom_presets_create_and_delete(self):
        with tempfile.TemporaryDirectory() as td:
            db = Path(td) / "custom.db"
            store = CustomPresetsSQLite(db)
            created = store.create("x", "/s", "/t")
            self.assertTrue(created["id"] > 0)
            self.assertEqual(len(store.list_all()), 1)
            store.delete(created["id"])
            self.assertEqual(len(store.list_all()), 0)

    def test_undo_sqlite_save_and_undo_move(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            src = root / "a.txt"
            dst = root / "b.txt"
            src.write_text("x")
            os.rename(src, dst)

            undo = UndoManagerSQLite(root / "undo.db")
            undo.save_operation("op1", [{"original": str(src), "new": str(dst), "action": "MOVE"}])
            result = undo.undo_last_operation()
            self.assertTrue(result["success"])
            self.assertTrue(src.exists())
            self.assertFalse(dst.exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
