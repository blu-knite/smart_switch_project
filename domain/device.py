from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional, Dict, Any

@dataclass
class Device:
    id: Optional[int] = None
    board_uid: str = ""
    ip_address: Optional[str] = None
    geo_location: Optional[Dict[str, Any]] = None
    status: str = "UNKNOWN"
    firmware_version: Optional[str] = None
    last_seen: Optional[datetime] = None
    created_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Device':
        return cls(**data)