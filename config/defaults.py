"""
Default values used as fallbacks in the system.
"""

from typing import Dict, Any

# Default context features
DEFAULT_CONTEXT_FEATURES: Dict[str, Any] = {
    'hour_of_day': 12,
    'day_of_week': 1,
    'month': 1,
    'season': 'winter',
    'is_weekend': False,
    'is_holiday': False,
    'temperature': 20.0,
    'humidity': 50.0,
    'occupancy': 0,
    'ambient_light': 500,
}

# Default energy values
DEFAULT_ENERGY_METRICS = {
    'cost_per_kwh': 0.15,
    'carbon_intensity': 400,
}

# Default pattern parameters
DEFAULT_PATTERN_PARAMS = {
    'min_sessions': 10,
    'cluster_count': 3,
}