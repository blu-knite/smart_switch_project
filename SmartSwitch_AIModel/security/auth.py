import hashlib
import hmac
from typing import Dict, Optional  # Add Dict here

class AuthManager:
    def __init__(self):
        self.tokens: Dict[str, str] = {}  # board_uid -> token_hash

    def verify_token(self, board_uid: str, token: str) -> bool:
        """Verify authentication token"""
        expected = self.tokens.get(board_uid)
        if not expected:
            # Register new board
            self.tokens[board_uid] = self._hash_token(token)
            return True
        return hmac.compare_digest(self._hash_token(token), expected)

    def _hash_token(self, token: str) -> str:
        """Hash token for storage"""
        return hashlib.sha256(token.encode()).hexdigest()

    def revoke_token(self, board_uid: str):
        """Revoke token for board"""
        if board_uid in self.tokens:
            del self.tokens[board_uid]


# Global instance
auth_manager = AuthManager()