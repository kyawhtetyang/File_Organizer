"""
Centralized timestamp formatting for all pipeline steps.
Supports multiple presets (pCloud, Google Photos, etc.)
"""

from datetime import datetime
from typing import Dict, Optional


class TimestampFormatter:
    """Centralized timestamp formatting for all pipeline steps."""

    # Preset configurations for different cloud services
    PRESETS: Dict[str, dict] = {
        "pcloud": {
            "date_separator": "-",
            "datetime_separator": " ",
            "hour_format": "12",
            "hour_padding": False,
            "include_microseconds": True
        },
        "google_photos": {
            "date_separator": "-",
            "datetime_separator": "_",
            "hour_format": "24",
            "hour_padding": True,
            "include_microseconds": False
        },
        "default": {
            "date_separator": "-",
            "datetime_separator": "_",
            "hour_format": "12",
            "hour_padding": True,
            "include_microseconds": False
        }
    }

    def __init__(self, preset_name: str = "pcloud", global_12h_format: Optional[bool] = None):
        """
        Initialize formatter with a preset.

        Args:
            preset_name: Name of the preset to use (default: "pcloud")
            global_12h_format: Override hour format from global config (True=12h, False=24h)
        """
        self.preset_name = preset_name
        # Deep copy to avoid mutating class variable
        self.config = self.PRESETS.get(preset_name, self.PRESETS["default"]).copy()

        # Apply Global Override if set
        if global_12h_format is not None:
            if global_12h_format:
                self.config["hour_format"] = "12"
                self.config["hour_padding"] = False  # 12h = 1-52-24PM (Strict Rule)
            else:
                self.config["hour_format"] = "24"
                self.config["hour_padding"] = True   # 24h = 13-52-24 (Strict Rule)

    def format(self, dt: datetime) -> str:
        """
        Generate timestamp string based on preset config.

        Args:
            dt: datetime object to format

        Returns:
            Formatted timestamp string

        Examples:
            pcloud: "2024-01-01 2-00-00PM_000001"
            google_photos: "2024-01-01_14-00-00"
        """
        # Date part: YYYY-MM-DD or YYYY/MM/DD
        date_str = dt.strftime(f"%Y{self.config['date_separator']}%m{self.config['date_separator']}%d")

        # Time part
        if self.config["hour_format"] == "12":
            if self.config["hour_padding"]:
                hour = dt.strftime("%I")  # 02
            else:
                hour = dt.strftime("%I").lstrip('0') or '12'  # 2
            time_str = f"{hour}-{dt.strftime('%M-%S%p')}"
        else:  # 24-hour
            hour = dt.strftime("%H")
            time_str = f"{hour}-{dt.strftime('%M-%S')}"

        # Combine date and time
        timestamp = f"{date_str}{self.config['datetime_separator']}{time_str}"

        # Add microseconds if enabled
        if self.config["include_microseconds"]:
            timestamp += f"_{dt.strftime('%f')}"

        return timestamp

    @classmethod
    def get_preset_names(cls) -> list:
        """Get list of available preset names."""
        return list(cls.PRESETS.keys())

    @classmethod
    def get_preset_example(cls, preset_name: str) -> str:
        """Get example timestamp for a preset."""
        formatter = cls(preset_name)
        example_dt = datetime(2024, 1, 1, 14, 30, 45, 123456)
        return formatter.format(example_dt)












