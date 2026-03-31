import re
import json
from datetime import datetime
from typing import Optional

from domain.event import Event

class MQTTParser:
    def parse(self, topic: str, payload: str) -> Optional[Event]:
        parts = topic.split("/")
        
        # Check for smartroom format
        if len(parts) >= 2 and parts[0] == "smartroom":
            board_uid = parts[1]
            timestamp = datetime.now()
            
            # Pattern: smartroom/{deviceID}/status
            if len(parts) >= 3 and parts[2] == "status":
                return Event(
                    type="status",
                    board_uid=board_uid,
                    status=payload.strip(),
                    timestamp=timestamp
                )
            
            # Pattern: smartroom/{deviceID}/command
            if len(parts) >= 3 and parts[2] == "command":
                return Event(
                    type="device_command",
                    board_uid=board_uid,
                    message=payload.strip(),
                    timestamp=timestamp
                )
            
            # Pattern: smartroom/{deviceID}/logs
            if len(parts) >= 3 and parts[2] == "logs":
                return Event(
                    type="device_log",
                    board_uid=board_uid,
                    message=payload.strip(),
                    timestamp=timestamp
                )
            
            # Pattern: smartroom/{deviceID}/switch{index}/state
            if len(parts) >= 4 and parts[2].startswith("switch") and parts[3] == "state":
                switch_match = re.search(r'switch(\d+)', parts[2])
                if switch_match:
                    return Event(
                        type="switch",
                        board_uid=board_uid,
                        switch_index=int(switch_match.group(1)),
                        state=payload.strip().upper(),
                        timestamp=timestamp
                    )
            
            # Pattern: smartroom/{deviceID}/switch{index}/mode/state
            if len(parts) >= 5 and parts[2].startswith("switch") and parts[3] == "mode" and parts[4] == "state":
                switch_match = re.search(r'switch(\d+)', parts[2])
                if switch_match:
                    try:
                        mode_value = int(payload.strip())
                    except:
                        mode_value = 0
                    return Event(
                        type="mode",
                        board_uid=board_uid,
                        switch_index=int(switch_match.group(1)),
                        mode=mode_value,
                        timestamp=timestamp
                    )
            
            # Pattern: smartroom/{deviceID}/switch{index}/mode/name
            if len(parts) >= 5 and parts[2].startswith("switch") and parts[3] == "mode" and parts[4] == "name":
                switch_match = re.search(r'switch(\d+)', parts[2])
                if switch_match:
                    return Event(
                        type="mode_name",
                        board_uid=board_uid,
                        switch_index=int(switch_match.group(1)),
                        message=payload.strip(),
                        timestamp=timestamp
                    )
            
            # Pattern: smartroom/{deviceID}/switch{index}/set (commands from web)
            if len(parts) >= 4 and parts[2].startswith("switch") and parts[3] == "set":
                switch_match = re.search(r'switch(\d+)', parts[2])
                if switch_match:
                    return Event(
                        type="switch_command",
                        board_uid=board_uid,
                        switch_index=int(switch_match.group(1)),
                        state=payload.strip().upper(),
                        timestamp=timestamp
                    )
            
            # Pattern: smartroom/{deviceID}/switch{index}/mode/set
            if len(parts) >= 5 and parts[2].startswith("switch") and parts[3] == "mode" and parts[4] == "set":
                switch_match = re.search(r'switch(\d+)', parts[2])
                if switch_match:
                    try:
                        mode_value = int(payload.strip())
                    except:
                        mode_value = 0
                    return Event(
                        type="mode_command",
                        board_uid=board_uid,
                        switch_index=int(switch_match.group(1)),
                        mode=mode_value,
                        timestamp=timestamp
                    )
        
        # Try JSON parsing as fallback
        return self._try_json_parse(topic, payload)

    def _try_json_parse(self, topic: str, payload: str) -> Optional[Event]:
        try:
            data = json.loads(payload)
            board_uid = data.get('board_uid') or topic.split('/')[1] if '/' in topic else None
            if not board_uid:
                return None
            return Event.from_dict({**data, 'board_uid': board_uid})
        except:
            return None
