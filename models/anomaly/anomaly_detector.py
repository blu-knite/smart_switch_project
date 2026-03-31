import numpy as np
from scipy import stats
from typing import Dict, Any, Optional

from config.settings import settings

def detect_anomaly(actual: float, predicted: Optional[float], switch_key: str, context: Optional[Dict] = None) -> Dict[str, Any]:
    result = {'is_anomaly': False, 'score': 0.0, 'type': 'normal', 'confidence': 0.0}

    if predicted:
        pred_error = abs(actual - predicted) / predicted if predicted > 0 else 0
        if pred_error > settings.ANOMALY_THRESHOLD:
            result['is_anomaly'] = True
            result['type'] = 'prediction_deviation'
            result['score'] = min(1.0, pred_error)

    # Statistical
    history = []  # Fetch history
    if len(history) >= 10:
        mean, std = np.mean(history), np.std(history)
        z_score = abs(actual - mean) / std if std > 0 else 0
        if z_score > settings.ANOMALY_ZSCORE_THRESHOLD:
            result['is_anomaly'] = True
            result['score'] = max(result['score'], min(1.0, z_score / settings.ANOMALY_ZSCORE_THRESHOLD))

    # Contextual (placeholder)
    if context:
        # Add context score
        pass

    # Confidence
    result['confidence'] = min(0.95, result['score'] * 0.8 + 0.2)

    return result