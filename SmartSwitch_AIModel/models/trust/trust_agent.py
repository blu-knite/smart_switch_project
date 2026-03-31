from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from config.settings import settings

class TrustAgent:
    def __init__(self):
        self.scores: Dict[str, float] = {}
        self.history: Dict[str, List[Dict]] = {}
        self.last_updates: Dict[str, datetime] = {}  # Track last update time

    def update(self, duration: float, predicted: float, context: Optional[Dict] = None) -> float:
        """Update trust score based on prediction accuracy"""
        key = context.get('board_uid', 'default') if context else 'default'
        
        # Initialize if needed
        if key not in self.scores:
            self.scores[key] = settings.TRUST_INITIAL
            self.last_updates[key] = datetime.now()

        current = self.scores[key]
        last_update = self.last_updates.get(key, datetime.now())

        # Apply time decay
        hours_since = (datetime.now() - last_update).total_seconds() / 3600
        decay = min(0.1, hours_since / 24 * settings.TRUST_DECAY_PER_DAY)
        current = max(settings.TRUST_MIN, current - decay)

        # Update based on prediction accuracy
        if predicted > 0:
            error = abs(duration - predicted) / predicted
            if error < 0.2:  # Good prediction
                # Gradual increase
                current += 0.05 * (1 - current)
            elif error < 0.5:  # Moderate error
                # Slight decrease
                current -= 0.03 * current
            else:  # Poor prediction
                # Larger decrease
                current -= 0.1 * current

        # Clamp to allowed range
        current = max(settings.TRUST_MIN, min(settings.TRUST_MAX, current))
        
        # Update state
        self.scores[key] = current
        self.last_updates[key] = datetime.now()
        
        # Log update
        self._log_update(key, current, error if predicted > 0 else 0)
        
        return current

    def get_trust(self, key: str = None) -> float:
        """Get current trust score"""
        key = key or 'default'
        if key not in self.scores:
            return settings.TRUST_INITIAL
        return self.scores[key]

    def last_update(self, key: str) -> datetime:
        """Get last update time for key"""
        return self.last_updates.get(key, datetime.now())

    def _log_update(self, key: str, score: float, error: float = 0):
        """Log trust update to history"""
        if key not in self.history:
            self.history[key] = []
        
        self.history[key].append({
            'timestamp': datetime.now().isoformat(),
            'score': score,
            'error': error
        })
        
        # Keep last 100 updates
        if len(self.history[key]) > 100:
            self.history[key] = self.history[key][-100:]

    def get_history(self, key: str, limit: int = 50) -> List[Dict]:
        """Get trust history for analysis"""
        if key in self.history:
            return self.history[key][-limit:]
        return []

    def reset_trust(self, key: str):
        """Reset trust to initial value"""
        self.scores[key] = settings.TRUST_INITIAL
        self.last_updates[key] = datetime.now()


# Global instance
_trust_agent = TrustAgent()

def update(duration: float, predicted: float, context: Optional[Dict] = None) -> float:
    """Update trust score (backward compatibility)"""
    return _trust_agent.update(duration, predicted, context)

def get_trust(key: str = None) -> float:
    """Get trust score"""
    return _trust_agent.get_trust(key)