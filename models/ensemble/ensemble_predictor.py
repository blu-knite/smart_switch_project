import numpy as np
import joblib
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

from config.settings import settings
from models.base.predictor import BasePredictor
from models.lstm.lstm_predictor import LSTMPredictor
from utils.features import extract_features

class EnsemblePredictor(BasePredictor):
    def __init__(self):
        self.lstm = LSTMPredictor()
        self.weights = [0.4, 0.3, 0.2, 0.1]  # LSTM, XGBoost, RF, Stat
        self.cache = {}
        self.model_dir = settings.MODEL_DIR / "ensemble"
        self.model_dir.mkdir(exist_ok=True)
        self.models = {}  # For other model types

    def predict(self, switch_key: str, history: List[float], context: Optional[Dict] = None) -> Optional[float]:
        """Make ensemble prediction"""
        if len(history) < 10:
            return None

        cache_key = f"{switch_key}_{len(history)}_{hash(str(context)) if context else ''}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        predictions = []
        weights_used = []

        # LSTM prediction
        lstm_pred = self.lstm.predict(switch_key, history)
        if lstm_pred is not None:
            predictions.append(lstm_pred)
            weights_used.append(self.weights[0])

        # Statistical prediction (simple moving average)
        if len(history) >= 5:
            stat_pred = float(np.mean(history[-5:]))
            predictions.append(stat_pred)
            weights_used.append(self.weights[3])

        # TODO: Add XGBoost and Random Forest when implemented

        if not predictions:
            return None

        # Normalize weights
        weights_used = np.array(weights_used) / sum(weights_used)
        
        # Weighted average
        ensemble_pred = np.average(predictions, weights=weights_used)

        # Cache prediction
        self.cache[cache_key] = float(ensemble_pred)

        # Limit cache size
        if len(self.cache) > 1000:
            # Remove oldest 100 items
            keys_to_remove = list(self.cache.keys())[:100]
            for k in keys_to_remove:
                del self.cache[k]

        return float(ensemble_pred)

    def train(self, switch_key: str, history: List[float]) -> bool:
        """Train ensemble models"""
        # Train LSTM
        lstm_result = self.lstm.train(switch_key, history)
        
        # Train other models when implemented
        # self._train_xgboost(switch_key, history)
        # self._train_random_forest(switch_key, history)
        
        return lstm_result

    def cache_prediction(self, switch_key: str, history: List[float], context: Optional[Dict] = None):
        """Pre-compute and cache prediction"""
        self.predict(switch_key, history, context)

    def save_model(self, switch_key: str):
        """Save ensemble model"""
        model_data = {
            'weights': self.weights,
            'timestamp': datetime.now().isoformat()
        }
        with open(self.model_dir / f"{switch_key}_ensemble.json", 'w') as f:
            json.dump(model_data, f)

    def load_model(self, switch_key: str):
        """Load ensemble model"""
        model_path = self.model_dir / f"{switch_key}_ensemble.json"
        if model_path.exists():
            with open(model_path, 'r') as f:
                model_data = json.load(f)
                self.weights = model_data.get('weights', self.weights)