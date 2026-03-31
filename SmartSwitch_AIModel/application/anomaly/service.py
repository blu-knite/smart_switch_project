import logging
from typing import Dict, Any, Optional

from config.settings import settings
from models.anomaly.anomaly_detector import detect_anomaly
from domain.session import Session

logger = logging.getLogger(__name__)

class AnomalyService:
    def detect(self, actual: float, predicted: Optional[float], session: Session) -> Dict[str, Any]:
        """Detect anomaly for session"""
        switch_key = f"switch_{session.switch_id}"
        
        # Extract context data if available
        context = None
        if hasattr(session, 'context_data') and session.context_data:
            if hasattr(session.context_data, 'to_dict'):
                context = session.context_data.to_dict()
            else:
                context = session.context_data
        
        return detect_anomaly(actual, predicted, switch_key, context)
