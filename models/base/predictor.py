from abc import ABC, abstractmethod
from typing import List, Optional

class BasePredictor(ABC):
    @abstractmethod
    def predict(self, key: str, history: List[float]) -> Optional[float]:
        pass

    @abstractmethod
    def train(self, key: str, history: List[float]) -> bool:
        pass