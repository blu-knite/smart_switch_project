from abc import ABC, abstractmethod
from typing import List

class BaseTrainer(ABC):
    @abstractmethod
    def train_model(self, key: str, history: List[float]) -> bool:
        pass