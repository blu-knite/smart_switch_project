import re
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List  # Add Dict here

from config.settings import settings

class SecurityDetector:
    def __init__(self):
        self.failed_attempts: Dict[str, List[datetime]] = {}  # Now Dict is defined

    def detect_intrusion(self, board_uid: str, event: Optional[Dict] = None) -> float:
        """Detect potential intrusion"""
        score = 0.0

        # Format check
        if not re.match(r'^[A-Za-z][A-Za-z0-9_-]{3,}$', board_uid):
            score += 0.2

        # Rate limiting
        now = datetime.now()
        if board_uid not in self.failed_attempts:
            self.failed_attempts[board_uid] = []
        
        # Clean old attempts
        self.failed_attempts[board_uid] = [
            t for t in self.failed_attempts[board_uid] 
            if t > now - timedelta(minutes=5)
        ]
        
        # Check rate
        if len(self.failed_attempts[board_uid]) > 10:
            score += 0.4
        elif len(self.failed_attempts[board_uid]) > 5:
            score += 0.2
            
        self.failed_attempts[board_uid].append(now)

        # Event analysis
        if event and event.get('type') == 'switch':
            # Check for rapid toggling
            pass

        return min(1.0, score)

    def reset_attempts(self, board_uid: str):
        """Reset failed attempts for board"""
        if board_uid in self.failed_attempts:
            self.failed_attempts[board_uid] = []


# Global instance
_security_detector = SecurityDetector()

def detect_intrusion(board_uid: str, event: Optional[Dict] = None) -> float:
    """Detect intrusion (backward compatibility)"""
    return _security_detector.detect_intrusion(board_uid, event)