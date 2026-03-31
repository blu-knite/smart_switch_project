import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from config.settings import settings
from models.ensemble.ensemble_predictor import EnsemblePredictor
from models.lstm.lstm_predictor import LSTMPredictor
from infrastructure.persistence.sqlite.repository import SessionRepository

logger = logging.getLogger(__name__)

class PredictionService:
    def __init__(self):
        self.ensemble = EnsemblePredictor()
        self.lstm = LSTMPredictor()
        self.session_repo = SessionRepository()

    async def predict(self, switch_key: str, session: 'Session') -> Optional[float]:
        """Make prediction for switch"""
        history = await self._get_history(switch_key)
        
        if settings.ENABLE_ENSEMBLE:
            return self.ensemble.predict(switch_key, history, context=session.context_data if hasattr(session, 'context_data') else None)
        else:
            return self.lstm.predict(switch_key, history)

    async def prefetch_prediction(self, switch_id: int, switch_key: str):
        """Pre-fetch prediction for faster response"""
        history = await self._get_history(switch_key)
        if len(history) >= settings.MIN_TRAIN_SAMPLES:
            self.ensemble.cache_prediction(switch_key, history)

    async def _get_history(self, switch_key: str, limit: int = 100) -> List[float]:
        """Get historical durations for switch"""
        try:
            # Parse switch_key (format: "device_uid:switch_index")
            if ':' in switch_key:
                device_uid, switch_index = switch_key.split(':')
                # You'll need to map to switch_id - this is a placeholder
                # In reality, you'd query the database to get switch_id from device_uid and switch_index
                switch_id = None
                
                # For now, return empty list
                return []
            return []
        except Exception as e:
            logger.error(f"Error getting history for {switch_key}: {e}")
            return []
