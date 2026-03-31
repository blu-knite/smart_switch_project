import logging

from config.settings import settings
from domain.device import Device
from domain.event import Event
from security.detector import detect_intrusion

logger = logging.getLogger(__name__)

class SecurityService:
    def detect_intrusion(self, device: Device, event: Event) -> float:
        return detect_intrusion(device.board_uid, event.to_dict())