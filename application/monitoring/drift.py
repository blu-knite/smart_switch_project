import logging
from typing import Dict, Any, Optional
from datetime import datetime

from models.drift.drift_monitor import _drift_monitor
from config.settings import settings

logger = logging.getLogger(__name__)

class DriftMonitorService:
    async def check_all(self) -> Dict[str, Any]:
        """Check drift for all switches"""
        result = _drift_monitor.detect_drift()
        if result.get('drift_detected'):
            logger.warning(f"Drift detected: {result['score']:.2f}")
            # Trigger retrain if needed
            if settings.ENABLE_AUTO_RETRAIN and result['score'] > settings.DRIFT_THRESHOLD * 1.2:
                await self._trigger_retrain()
        return result

    async def check_switch(self, switch_key: str) -> Dict[str, Any]:
        """Check drift for specific switch"""
        return _drift_monitor.detect_drift(switch_key)

    def add_drift_data(self, session: 'Session'):
        """Add session data to drift monitor"""
        if session.predicted_duration and session.predicted_duration > 0:
            error = abs(session.duration - session.predicted_duration) / session.predicted_duration
            switch_key = f"switch_{session.switch_id}"
            _drift_monitor.add(error, switch_key, session.predicted_duration, session.duration)

    async def _trigger_retrain(self):
        """Trigger model retraining"""
        from models.retraining.auto_retrainer import auto_retrainer
        logger.info("Auto-retrain triggered by drift detection")
        # In a real implementation, you'd get all switch keys and retrain
