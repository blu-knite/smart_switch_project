"""
Persistence layer abstractions.
"""
from .sqlite.connection import get_connection
from .sqlite.repository import DeviceRepository, SwitchRepository, SessionRepository

__all__ = ["get_connection", "DeviceRepository", "SwitchRepository", "SessionRepository"]