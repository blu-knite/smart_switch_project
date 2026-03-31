from datetime import datetime
from typing import Dict, Any, List, Optional
import json

from config.settings import settings
from config.defaults import DEFAULT_CONTEXT_FEATURES
from domain.context import Context
from infrastructure.persistence.geoip import geoip_service

class ContextEngine:
    def __init__(self):
        self.contexts = {}  # board_uid -> Context

    def update_context(self, board_uid: str, event: Dict[str, Any]):
        if board_uid not in self.contexts:
            self.contexts[board_uid] = Context()

        ctx = self.contexts[board_uid]
        ctx.last_update = datetime.now()
        ctx.events.append({"timestamp": event.get("timestamp"), "type": event.get("type"), "data": event})

        # Limit events
        if len(ctx.events) > 100:
            ctx.events = ctx.events[-100:]

        self._update_from_event(ctx, event)

    def get_current_context(self, board_uid: str) -> Context:
        if board_uid not in self.contexts:
            return Context()
        ctx = self.contexts[board_uid]
        # Update temporal
        now = datetime.now()
        ctx.temporal = {
            'hour': now.hour,
            'day_of_week': now.weekday(),
            'month': now.month,
            'season': self._get_season(now),
            'is_weekend': now.weekday() >= 5,
            'is_night': 22 <= now.hour or now.hour < 6
        }
        return ctx

    def get_features(self, board_uid: str) -> List[float]:
        ctx = self.get_current_context(board_uid)
        features = []

        # Temporal features (normalized)
        features.extend([
            ctx.temporal['hour'] / 24,
            ctx.temporal['day_of_week'] / 7,
            ctx.temporal['month'] / 12,
            1 if ctx.temporal['is_weekend'] else 0,
            1 if ctx.temporal['is_night'] else 0,
        ])

        # Behavioral (placeholder)
        features.append(0.5)  # avg_duration normalized
        features.append(0.5)  # frequency

        # Geographic
        if ctx.geographic.get('latitude'):
            features.append((ctx.geographic['latitude'] + 90) / 180)
            features.append((ctx.geographic['longitude'] + 180) / 360)
        else:
            features.extend([0.5, 0.5])

        return features

    def geolocate_ip(self, ip: str) -> Optional[Dict[str, Any]]:
        return geoip_service.geolocate(ip)

    def _get_season(self, date: datetime) -> str:
        month = date.month
        if month in [12, 1, 2]: return 'winter'
        elif month in [3, 4, 5]: return 'spring'
        elif month in [6, 7, 8]: return 'summer'
        return 'fall'

    def _update_from_event(self, ctx: Context, event: Dict[str, Any]):
        if event['type'] == 'public_ip' and 'ip' in event:
            geo = self.geolocate_ip(event['ip'])
            if geo:
                ctx.geographic = geo
        # More updates...