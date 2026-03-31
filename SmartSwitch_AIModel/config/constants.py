"""
Immutable constants like topics, versions, etc.
"""

from typing import List, Dict

MQTT_TOPICS: List[str] = [
    "smartroom/#",
    "smartswitch/+/+/state",
    "smartswitch/+/status",
]

# Mode definitions matching your Arduino code
MODE_MANUAL_ONLY = 0          # Manual control only
MODE_PRESENCE_MANUAL = 1       # Presence detection + manual override
MODE_AI_MANUAL = 2             # AI control + manual override
MODE_AI_PRESENCE_MANUAL = 3    # AI + presence + manual (full auto)

MODE_NAMES: Dict[int, str] = {
    0: "MANUAL_ONLY",
    1: "PRESENCE_MANUAL",
    2: "AI_MANUAL",
    3: "AI_PRESENCE_MANUAL"
}

# Human-readable descriptions
MODE_DESCRIPTIONS: Dict[int, str] = {
    0: "Manual control only - AI monitors but does not control",
    1: "Presence detection with manual override - AI adjusts based on occupancy",
    2: "AI control with manual override - AI makes decisions, user can override",
    3: "Full automation - AI + presence detection with manual override"
}

# Default mode
DEFAULT_MODE = MODE_AI_PRESENCE_MANUAL

SEASONS: List[str] = ['winter', 'spring', 'summer', 'fall']

SYSTEM_VERSION: str = "2.0.0"
DB_SCHEMA_VERSION: int = 3
