from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional, Dict, Any, Union

@dataclass
class Event:
    type: str = ""  # status, public_ip, switch, mode, device_log, switch_log, switch_command, mode_command, device_command, mode_name
    board_uid: str = ""
    switch_index: Optional[int] = None
    state: Optional[str] = None  # ON/OFF/TOGGLE for switch
    status: Optional[str] = None
    ip: Optional[str] = None
    mode: Optional[Union[int, str]] = None
    message: Optional[str] = None
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

    def to_dict(self) -> dict:
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Event':
        """Create Event from dictionary with flexible field mapping"""
        # Handle different possible field names
        field_mapping = {
            'type': ['type', 'event_type'],
            'board_uid': ['board_uid', 'board_id', 'device_id', 'uid'],
            'switch_index': ['switch_index', 'switch', 'index'],
            'state': ['state', 'value', 'action'],
            'status': ['status'],
            'ip': ['ip', 'ip_address'],
            'mode': ['mode'],
            'message': ['message', 'msg', 'log'],
        }
        
        kwargs = {}
        for target, sources in field_mapping.items():
            for source in sources:
                if source in data:
                    kwargs[target] = data[source]
                    break
        
        # Handle timestamp
        if 'timestamp' in data:
            if isinstance(data['timestamp'], str):
                kwargs['timestamp'] = datetime.fromisoformat(data['timestamp'])
            elif isinstance(data['timestamp'], datetime):
                kwargs['timestamp'] = data['timestamp']
        
        return cls(**kwargs)
