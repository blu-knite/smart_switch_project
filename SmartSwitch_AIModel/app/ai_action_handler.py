"""
Handles AI-generated actions and commands using smartroom topic format
with proper mode numbers (0-3)
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import json

from infrastructure.mqtt.client import MQTTClient
from domain.device import Device
from domain.switch import Switch
from config.constants import (
    MODE_NAMES, 
    MODE_DESCRIPTIONS, 
    MODE_MANUAL_ONLY, 
    MODE_PRESENCE_MANUAL, 
    MODE_AI_MANUAL, 
    MODE_AI_PRESENCE_MANUAL
)

logger = logging.getLogger(__name__)

class AIActionHandler:
    """
    Executes AI-generated actions on devices via MQTT using smartroom topic format
    Topic format: smartroom/{deviceID}/switch{index}/set
                 smartroom/{deviceID}/switch{index}/mode/set
                 smartroom/{deviceID}/switch{index}/mode/get
                 smartroom/{deviceID}/command
    """
    
    # Mode mapping for AI recommendations
    MODE_RECOMMENDATIONS = {
        'night': MODE_PRESENCE_MANUAL,      # At night, use presence detection
        'day': MODE_AI_PRESENCE_MANUAL,      # During day, full automation
        'away': MODE_AI_MANUAL,               # When away, let AI decide
        'manual': MODE_MANUAL_ONLY,           # User wants manual control
        'eco': MODE_AI_PRESENCE_MANUAL,       # Eco mode uses full automation
        'presence_only': MODE_PRESENCE_MANUAL  # Just presence detection
    }
    
    def __init__(self, mqtt_client: MQTTClient):
        self.mqtt_client = mqtt_client
        self.action_history = []
        
    async def set_switch_state(self, device: Device, switch: Switch, state: str, 
                               confidence: float, reason: str, mode: int = None) -> bool:
        """
        Set switch state using: smartroom/{deviceID}/switch{index}/set
        state: ON or OFF
        mode: optional mode number to set after state change
        """
        # Format: smartroom/{deviceID}/switch{index}/set
        topic = f"smartroom/{device.board_uid}/switch{switch.switch_index}/set"
        
        # Payload is just the state (ON/OFF) as string
        payload = state
        
        logger.info(f"🤖 AI setting {topic} to {state} "
                   f"(confidence: {confidence:.2f}) - {reason}")
        
        try:
            self.mqtt_client.publish(topic, payload)
            self._log_action('set_state', device, switch, state, confidence, reason)
            
            # If mode is specified, also set the mode
            if mode is not None:
                await self.set_mode(device, switch, mode, confidence, 
                                   f"Mode adjustment after state change: {reason}")
            
            return True
        except Exception as e:
            logger.error(f"Failed to set switch state: {e}")
            return False
    
    async def set_mode(self, device: Device, switch: Switch, mode: int,
                       confidence: float, reason: str) -> bool:
        """
        Set switch mode using: smartroom/{deviceID}/switch{index}/mode/set
        mode: 0=MANUAL_ONLY, 1=PRESENCE_MANUAL, 2=AI_MANUAL, 3=AI_PRESENCE_MANUAL
        
        Mode meanings:
        0: Manual control only - AI monitors but does not control
        1: Presence detection with manual override - AI adjusts based on occupancy
        2: AI control with manual override - AI makes decisions, user can override
        3: Full automation - AI + presence detection with manual override
        """
        # Validate mode
        if mode not in [0, 1, 2, 3]:
            logger.error(f"Invalid mode: {mode}. Must be 0-3")
            return False
        
        # Format: smartroom/{deviceID}/switch{index}/mode/set
        topic = f"smartroom/{device.board_uid}/switch{switch.switch_index}/mode/set"
        
        # Payload is the mode number as string
        payload = str(mode)
        
        mode_name = self._get_mode_name(mode)
        logger.info(f"🤖 AI setting mode for {topic} to {mode_name} ({mode}) - {reason}")
        
        try:
            self.mqtt_client.publish(topic, payload)
            self._log_action('set_mode', device, switch, str(mode), confidence, reason)
            return True
        except Exception as e:
            logger.error(f"Failed to set mode: {e}")
            return False
    
    async def get_mode(self, device: Device, switch: Switch) -> Optional[int]:
        """
        Request current mode using: smartroom/{deviceID}/switch{index}/mode/get
        Returns the mode number or None if failed
        """
        # Format: smartroom/{deviceID}/switch{index}/mode/get
        topic = f"smartroom/{device.board_uid}/switch{switch.switch_index}/mode/get"
        
        # Empty payload for get requests
        payload = ""
        
        logger.info(f"🤖 AI requesting mode for {topic}")
        
        try:
            self.mqtt_client.publish(topic, payload)
            # Note: The response will come asynchronously via another topic
            # You'd need to listen for responses on smartroom/+/switch+/mode
            return None  # Mode will be returned via callback
        except Exception as e:
            logger.error(f"Failed to get mode: {e}")
            return None
    
    async def recommend_mode(self, device: Device, switch: Switch, 
                            context: Dict[str, Any]) -> int:
        """
        AI recommends optimal mode based on context
        Returns mode number 0-3
        """
        hour = context.get('temporal', {}).get('hour', 12)
        is_weekend = context.get('temporal', {}).get('is_weekend', False)
        is_night = context.get('temporal', {}).get('is_night', False)
        trust_score = context.get('trust_score', 0.7)
        
        # Decision logic for mode recommendation
        if is_night:
            # At night, use presence detection for safety/security
            recommended_mode = MODE_PRESENCE_MANUAL
            reason = "Night time - using presence detection for security"
        elif trust_score > 0.8:
            # High trust in AI - use full automation
            recommended_mode = MODE_AI_PRESENCE_MANUAL
            reason = "High AI trust score - enabling full automation"
        elif is_weekend:
            # Weekends - more flexible, use AI with manual override
            recommended_mode = MODE_AI_MANUAL
            reason = "Weekend - AI control with manual override"
        else:
            # Default to full automation
            recommended_mode = MODE_AI_PRESENCE_MANUAL
            reason = "Standard operation - AI + presence detection"
        
        logger.info(f"🤖 AI recommending mode {self._get_mode_name(recommended_mode)} "
                   f"for {device.board_uid}/switch{switch.switch_index}: {reason}")
        
        return recommended_mode
    
    async def send_command(self, device: Device, command: str, 
                          confidence: float, reason: str) -> bool:
        """
        Send general command using: smartroom/{deviceID}/command
        commands: reboot, status, sync, etc.
        """
        # Format: smartroom/{deviceID}/command
        topic = f"smartroom/{device.board_uid}/command"
        
        # Payload is the command as string
        payload = command
        
        logger.info(f"🤖 AI sending command '{command}' to {topic}")
        
        try:
            self.mqtt_client.publish(topic, payload)
            self._log_action('command', device, None, command, confidence, reason)
            return True
        except Exception as e:
            logger.error(f"Failed to send command: {e}")
            return False
    
    async def set_scene(self, device: Device, scene: str,
                       confidence: float, reason: str) -> bool:
        """
        Set scene using: smartroom/{deviceID}/command
        scenes: goodnight, away, home, movie, etc.
        This will set appropriate modes for all switches
        """
        topic = f"smartroom/{device.board_uid}/command"
        
        # Define scene configurations
        scene_configs = {
            'goodnight': {
                'modes': {1: MODE_PRESENCE_MANUAL, 2: MODE_PRESENCE_MANUAL, 3: MODE_PRESENCE_MANUAL},
                'states': {1: 'OFF', 2: 'OFF', 3: 'OFF'},
                'description': 'All switches off, presence mode for security'
            },
            'away': {
                'modes': {1: MODE_AI_MANUAL, 2: MODE_AI_MANUAL, 3: MODE_AI_MANUAL},
                'states': {1: 'OFF', 2: 'OFF', 3: 'OFF'},
                'description': 'AI controls with presence simulation'
            },
            'home': {
                'modes': {1: MODE_AI_PRESENCE_MANUAL, 2: MODE_AI_PRESENCE_MANUAL, 3: MODE_AI_PRESENCE_MANUAL},
                'description': 'Full automation mode'
            },
            'movie': {
                'modes': {1: MODE_PRESENCE_MANUAL, 2: MODE_PRESENCE_MANUAL, 3: MODE_MANUAL_ONLY},
                'states': {1: 'OFF', 2: 'OFF', 3: 'ON'},
                'description': 'Lights dim for movie'
            }
        }
        
        config = scene_configs.get(scene, {})
        
        payload = json.dumps({
            'scene': scene,
            'config': config,
            'source': 'ai',
            'confidence': confidence,
            'reason': reason
        })
        
        logger.info(f"🤖 AI setting scene '{scene}' for {device.board_uid}: {config.get('description', '')}")
        
        try:
            self.mqtt_client.publish(topic, payload)
            self._log_action('scene', device, None, scene, confidence, reason)
            return True
        except Exception as e:
            logger.error(f"Failed to set scene: {e}")
            return False
    
    def _get_mode_name(self, mode: int) -> str:
        """Get human-readable mode name"""
        return MODE_NAMES.get(mode, f"UNKNOWN_{mode}")
    
    def _get_mode_description(self, mode: int) -> str:
        """Get mode description"""
        return MODE_DESCRIPTIONS.get(mode, "Unknown mode")
    
    def _log_action(self, action_type: str, device: Device, switch: Optional[Switch],
                   value: str, confidence: float, reason: str):
        """Log action for audit and learning"""
        self.action_history.append({
            'timestamp': datetime.now().isoformat(),
            'action_type': action_type,
            'device_uid': device.board_uid,
            'switch_index': switch.switch_index if switch else None,
            'value': value,
            'confidence': confidence,
            'reason': reason
        })
        
        # Keep history manageable
        if len(self.action_history) > 1000:
            self.action_history = self.action_history[-1000:]
    
    def get_action_stats(self) -> Dict[str, Any]:
        """Get statistics about AI actions"""
        if not self.action_history:
            return {'total_actions': 0}
        
        last_24h = [
            a for a in self.action_history[-100:] 
            if datetime.fromisoformat(a['timestamp']) > datetime.now().replace(hour=0)
        ]
        
        # Count mode changes by value
        mode_changes = {}
        for action in self.action_history:
            if action['action_type'] == 'set_mode':
                mode_changes[action['value']] = mode_changes.get(action['value'], 0) + 1
        
        return {
            'total_actions': len(self.action_history),
            'actions_24h': len(last_24h),
            'by_type': self._count_by_type(),
            'mode_changes': mode_changes,
            'avg_confidence': sum(a['confidence'] for a in self.action_history[-100:]) / 100 if len(self.action_history) >= 100 else 0
        }
    
    def _count_by_type(self) -> Dict[str, int]:
        """Count actions by type"""
        counts = {}
        for action in self.action_history[-1000:]:  # Last 1000 actions
            action_type = action['action_type']
            counts[action_type] = counts.get(action_type, 0) + 1
        return counts
