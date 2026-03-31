import numpy as np
from scipy import stats
from typing import Dict, Any, List, Optional
from datetime import datetime

from config.settings import settings

class DriftMonitor:
    def __init__(self):
        self.errors: Dict[str, List[float]] = {}
        self.predictions: Dict[str, List[float]] = {}
        self.actuals: Dict[str, List[float]] = {}
        self.drift_history: Dict[str, List[Dict]] = {}

    def add(self, error: float, switch_key: str, prediction: float = None, actual: float = None):
        """Add error for drift detection"""
        if switch_key not in self.errors:
            self.errors[switch_key] = []
            self.predictions[switch_key] = []
            self.actuals[switch_key] = []
        
        self.errors[switch_key].append(error)
        if prediction is not None:
            self.predictions[switch_key].append(prediction)
        if actual is not None:
            self.actuals[switch_key].append(actual)
        
        # Keep within window
        if len(self.errors[switch_key]) > settings.DRIFT_WINDOW:
            self.errors[switch_key].pop(0)
        if len(self.predictions[switch_key]) > settings.DRIFT_WINDOW:
            self.predictions[switch_key].pop(0)
        if len(self.actuals[switch_key]) > settings.DRIFT_WINDOW:
            self.actuals[switch_key].pop(0)

    def detect_drift(self, switch_key: Optional[str] = None) -> Dict[str, Any]:
        """Detect drift for specific switch or globally"""
        if switch_key:
            return self._detect_for_key(switch_key)
        return self._detect_global()

    def _detect_for_key(self, switch_key: str) -> Dict[str, Any]:
        """Detect drift for specific switch"""
        errors = self.errors.get(switch_key, [])
        if len(errors) < 20:
            return {'drift_detected': False, 'score': 0.0, 'p_value': 1.0}

        # Split into two halves
        split = len(errors) // 2
        first_half = errors[:split]
        second_half = errors[split:]
        
        if len(first_half) < 10 or len(second_half) < 10:
            return {'drift_detected': False, 'score': 0.0, 'p_value': 1.0}

        # KS test for distribution shift
        ks_stat, p_val = stats.ks_2samp(first_half, second_half)
        score = min(1.0, ks_stat * 2)  # Scale KS statistic

        # Trend analysis
        if len(errors) >= 30:
            recent_mean = np.mean(errors[-10:])
            older_mean = np.mean(errors[-20:-10]) if len(errors) >= 20 else recent_mean
            trend_score = min(1.0, max(0, (recent_mean - older_mean) / (older_mean + 0.01)))
            score = max(score, trend_score)

        result = {
            'drift_detected': score > settings.DRIFT_THRESHOLD,
            'score': score,
            'p_value': p_val,
            'method': 'ks_test'
        }

        # Store in history
        if result['drift_detected']:
            if switch_key not in self.drift_history:
                self.drift_history[switch_key] = []
            self.drift_history[switch_key].append({
                'timestamp': datetime.now().isoformat(),
                'score': score,
                'p_value': p_val
            })
            # Keep last 100
            if len(self.drift_history[switch_key]) > 100:
                self.drift_history[switch_key].pop(0)

        return result

    def _detect_global(self) -> Dict[str, Any]:
        """Detect drift across all switches"""
        if not self.errors:
            return {'drift_detected': False, 'score': 0.0}

        # Aggregate all errors
        all_errors = []
        for errors in self.errors.values():
            all_errors.extend(errors[-20:])  # Last 20 from each

        if len(all_errors) < 50:
            return {'drift_detected': False, 'score': 0.0}

        # Count switches with drift
        drifted_switches = 0
        for key in self.errors:
            if self._detect_for_key(key)['drift_detected']:
                drifted_switches += 1

        drift_ratio = drifted_switches / max(1, len(self.errors))
        
        # Global trend
        global_mean = np.mean(all_errors)
        global_score = min(1.0, global_mean * 2)  # Scale

        return {
            'drift_detected': drift_ratio > 0.3 or global_score > settings.DRIFT_THRESHOLD,
            'score': max(drift_ratio, global_score),
            'drifted_switches': drifted_switches,
            'total_switches': len(self.errors)
        }

    def get_drift_history(self, switch_key: str) -> List[Dict]:
        """Get drift history for switch"""
        return self.drift_history.get(switch_key, [])


# Create global instance
_drift_monitor = DriftMonitor()

def add(error: float, switch_key: str, prediction: float = None, actual: float = None):
    """Add error to drift monitor (backward compatibility)"""
    _drift_monitor.add(error, switch_key, prediction, actual)

def detect_drift(switch_key: Optional[str] = None) -> Dict[str, Any]:
    """Detect drift (backward compatibility)"""
    return _drift_monitor.detect_drift(switch_key)