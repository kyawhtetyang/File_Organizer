from abc import ABC, abstractmethod
from typing import List
from .models import Context, FileItem

class Step(ABC):
    @abstractmethod
    def get_name(self) -> str:
        pass

    @abstractmethod
    def process(self, context: Context, items: List[FileItem]) -> List[FileItem]:
        """
        Process the list of items.
        Should return the list of items to pass to the next step.
        """
        pass

    def cleanup(self, context: Context):
        """
        Optional cleanup after execution (e.g. remove empty folders).
        Only called if dry_run=False.
        """
        pass




















