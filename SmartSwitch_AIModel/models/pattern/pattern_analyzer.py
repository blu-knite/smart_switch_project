import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from typing import Dict, Any, List

from config.settings import settings
from config.defaults import DEFAULT_PATTERN_PARAMS
from infrastructure.persistence.sqlite.repository import SessionRepository

class PatternAnalyzer:
    def __init__(self):
        self.clusters = {}
        self.repo = SessionRepository()

    def analyze(self, switch_key: str, duration: float, context: Dict[str, Any] = None) -> Dict[str, Any]:
        history = self._get_history(switch_key)
        if len(history) < DEFAULT_PATTERN_PARAMS['min_sessions']:
            return {'cluster': 0, 'is_typical': True, 'pattern_type': 'unknown'}

        features = self._extract_features(history)
        if switch_key not in self.clusters:
            self._fit_clusters(switch_key, features)

        current_features = self._extract_current(duration, context)
        cluster = self._predict_cluster(switch_key, current_features)

        return {
            'cluster': cluster,
            'is_typical': self._is_typical(duration, history),
            'pattern_type': self._get_pattern_type(cluster),
        }

    def _get_history(self, switch_key: str) -> List[Dict]:
        # Parse key and fetch
        return []  # Placeholder

    def _extract_features(self, history: List[Dict]) -> np.ndarray:
        # Implementation for features
        return np.random.rand(len(history), 5)  # Placeholder

    def _fit_clusters(self, switch_key: str, features: np.ndarray):
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features)
        kmeans = KMeans(n_clusters=DEFAULT_PATTERN_PARAMS['cluster_count'], random_state=42)
        clusters = kmeans.fit_predict(features_scaled)
        self.clusters[switch_key] = {'model': kmeans, 'scaler': scaler, 'labels': clusters}

    def _predict_cluster(self, switch_key: str, features: np.ndarray) -> int:
        if switch_key not in self.clusters:
            return 0
        cluster_info = self.clusters[switch_key]
        features_scaled = cluster_info['scaler'].transform(features)
        return cluster_info['model'].predict(features_scaled)[0]

    def _is_typical(self, duration: float, history: List[Dict]) -> bool:
        durations = [s.get('duration', 0) for s in history]
        median = np.median(durations)
        mad = np.median(np.abs(np.array(durations) - median))
        return abs(duration - median) <= 3 * mad

    def _get_pattern_type(self, cluster: int) -> str:
        types = {0: 'normal', 1: 'extended', 2: 'brief'}
        return types.get(cluster, 'unknown')

    def _extract_current(self, duration: float, context: Dict) -> np.ndarray:
        # Placeholder
        return np.array([[duration, 12, 1, 0, 0]])  # hour, etc.