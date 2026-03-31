import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional  # ADD Dict here

from config.settings import settings
from models.lstm.lstm_predictor import LSTMPredictor
from models.ensemble.ensemble_predictor import EnsemblePredictor
from infrastructure.persistence.sqlite.repository import SessionRepository

logger = logging.getLogger(__name__)

class AutoRetrain:
    def __init__(self):
        self.lstm = LSTMPredictor()
        self.ensemble = EnsemblePredictor()
        self.repo = SessionRepository()
        self.last_trains: Dict[str, datetime] = {}  # Now Dict is defined

    async def check_and_retrain(self, switch_key: str):
        """Check if retraining needed and retrain"""
        history = await self._get_history(switch_key)
        if len(history) < settings.MIN_TRAIN_SAMPLES:
            return

        last_train = self.last_trains.get(switch_key)
        if last_train and (datetime.now() - last_train) < timedelta(hours=24):
            return

        # Train models
        durations = [h.get('duration', 0) for h in history if h.get('duration')]
        if len(durations) >= settings.MIN_TRAIN_SAMPLES:
            self.lstm.train(switch_key, durations)
            self.ensemble.train(switch_key, durations)
            self.last_trains[switch_key] = datetime.now()
            logger.info(f"Retrained models for {switch_key} with {len(durations)} samples")

    async def _get_history(self, switch_key: str) -> List[Dict]:
        """Get session history for switch"""
        # Parse switch_key to get switch_id
        # For now return empty - implement actual DB query
        return []

# Global instance
auto_retrainer = AutoRetrain()