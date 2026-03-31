from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional

@dataclass
class Switch:
    id: Optional[int] = None
    device_id: int = 0
    switch_index: int = 0
    mode: str = "AUTO"
    power_rating: float = 60.0
    min_duration: float = 0.0
    max_duration: float = 86400.0
    created_at: Optional[datetime] = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> 'Switch':
        return cls(**data)