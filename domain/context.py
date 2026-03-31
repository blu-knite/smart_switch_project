from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, Any, List, Optional

@dataclass
class Context:
    temporal: Dict[str, Any] = None
    environmental: Dict[str, Any] = None
    behavioral: Dict[str, Any] = None
    geographic: Dict[str, Any] = None
    last_update: Optional[datetime] = None
    events: List[Dict[str, Any]] = None

    def __post_init__(self):
        if self.temporal is None:
            self.temporal = {}
        if self.environmental is None:
            self.environmental = {}
        if self.behavioral is None:
            self.behavioral = {}
        if self.geographic is None:
            self.geographic = {}
        if self.events is None:
            self.events = []

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['last_update'] = self.last_update.isoformat() if self.last_update else None
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Context':
        if isinstance(data.get('last_update'), str):
            data['last_update'] = datetime.fromisoformat(data['last_update'])
        return cls(**data)