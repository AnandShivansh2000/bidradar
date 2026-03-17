from abc import ABC, abstractmethod
from typing import Any


class BaseAgent(ABC):
    @abstractmethod
    async def run_scan(self, scan_id: str) -> Any:
        pass
