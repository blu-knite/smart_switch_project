import logging
from datetime import datetime
from typing import Optional

from domain.device import Device
from domain.switch import Switch
from infrastructure.persistence.sqlite.repository import DeviceRepository, SwitchRepository
from infrastructure.persistence.geoip import geoip_service

logger = logging.getLogger(__name__)

class SwitchEventService:
    def __init__(self):
        self.device_repo = DeviceRepository()
        self.switch_repo = SwitchRepository()

    async def update_device_status(self, device: Device, status: str):
        """Update device status"""
        device.status = status
        device.last_seen = datetime.now()
        # Use await since get_or_create is async
        updated_device = await self.device_repo.get_or_create(device)
        logger.debug(f"Updated device {device.board_uid} status to {status}")
        return updated_device

    async def update_public_ip(self, device: Device, ip: str):
        """Update device public IP"""
        device.ip_address = ip
        device.last_seen = datetime.now()
        geo = geoip_service.geolocate(ip)
        if geo:
            device.geo_location = geo
        # Use await since get_or_create is async
        updated_device = await self.device_repo.get_or_create(device)
        logger.info(f"Updated device {device.board_uid} IP to {ip}")
        return updated_device

    async def update_switch_mode(self, device: Device, switch_index: int, mode: int):
        """Update switch mode"""
        # First get or create the switch
        switch = Switch(device_id=device.id, switch_index=switch_index)
        switch = await self.switch_repo.get_or_create(switch)
        
        # Update the mode
        switch.mode = mode
        await self.switch_repo.update_mode(switch.id, mode)
        
        logger.info(f"Updated switch {device.board_uid}/{switch_index} mode to {mode}")
        return switch

    async def get_switch(self, device: Device, switch_index: int) -> Switch:
        """Get switch for device"""
        switch = Switch(device_id=device.id, switch_index=switch_index)
        return await self.switch_repo.get_or_create(switch)
