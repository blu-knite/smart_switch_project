from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional, Dict, Any

@dataclass
class Session:
    id: Optional[int] = None
    switch_id: int = 0
    start_time: datetime = datetime.now()
    end_time: Optional[datetime] = None
    duration: float = 0.0
    predicted_duration: Optional[float] = None
    anomaly: int = 0
    anomaly_score: Optional[float] = None
    trust_score: Optional[float] = None
    energy_wh: Optional[float] = None
    pattern_cluster: Optional[int] = None
    context_data: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Session':
        # Handle datetime strings
        if isinstance(data.get('start_time'), str):
            data['start_time'] = datetime.fromisoformat(data['start_time'])
        if isinstance(data.get('end_time'), str):
            data['end_time'] = datetime.fromisoformat(data['end_time'])
        return cls(**data)