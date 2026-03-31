import logging
from datetime import datetime
from typing import Optional, Dict, Any

from config.settings import settings
from config.constants import MODE_NAMES, MODE_DESCRIPTIONS
from domain.event import Event
from domain.device import Device
from domain.switch import Switch
from domain.session import Session
from application.switch_events.service import SwitchEventService
from application.prediction.service import PredictionService
from application.anomaly.service import AnomalyService
from application.security.service import SecurityService
from application.monitoring.drift import DriftMonitorService
from app.ai_decision_engine import AIDecisionEngine
from infrastructure.persistence.sqlite.repository import DeviceRepository, SwitchRepository, SessionRepository
from models.trust.trust_agent import TrustAgent

logger = logging.getLogger(__name__)

class EventProcessor:
    def __init__(self, mqtt_client=None):
        self.device_repo = DeviceRepository()
        self.switch_repo = SwitchRepository()
        self.session_repo = SessionRepository()
        self.switch_service = SwitchEventService()
        self.prediction_service = PredictionService()
        self.anomaly_service = AnomalyService()
        self.security_service = SecurityService()
        self.drift_service = DriftMonitorService()
        self.trust_agent = TrustAgent()
        
        # Initialize AI Decision Engine if MQTT client provided
        self.ai_engine = None
        if mqtt_client:
            self.ai_engine = AIDecisionEngine(mqtt_client)
            logger.info("AI Decision Engine initialized")

    async def process_event(self, event: Event) -> Optional[dict]:
        """
        Main event processing pipeline with AI decisions.
        """
        try:
            board_uid = event.board_uid
            # AWAIT the coroutine
            device = await self.device_repo.get_or_create(Device(board_uid=board_uid))
            logger.info(f"Processing event for device {board_uid}: {event.type}")

            # Security check
            intrusion_score = self.security_service.detect_intrusion(device, event)
            if intrusion_score > settings.ANOMALY_THRESHOLD:
                logger.warning(f"Intrusion detected for {board_uid}: {intrusion_score}")
                return {"status": "blocked", "score": intrusion_score}

            # Route by event type
            if event.type == "status":
                # AWAIT the coroutine
                await self.switch_service.update_device_status(device, event.status)
                
                # AI: Check if we need to act on status
                if self.ai_engine:
                    # Get all switches for this device and make decisions
                    switches = await self._get_device_switches(device.id)
                    for switch in switches:
                        await self.ai_engine.predict_and_act(device, switch, event.status)
                
                return {"status": "updated"}

            elif event.type == "public_ip":
                # AWAIT the coroutine
                await self.switch_service.update_public_ip(device, event.ip)
                
                # AI: Update context with new location
                if self.ai_engine:
                    self.ai_engine.context.geolocate_ip(event.ip)
                
                return {"status": "updated"}

            elif event.type == "mode_name":
                # Just log mode name, no action needed
                logger.debug(f"Mode name for {board_uid} switch {event.switch_index}: {event.message}")
                return {"status": "logged"}

            elif event.type in ["mode", "mode_command"]:
                # Handle mode updates
                mode_value = event.mode
                if isinstance(mode_value, str):
                    try:
                        mode_value = int(mode_value)
                    except ValueError:
                        # Try to map string mode to number
                        mode_map = {
                            'MANUAL_ONLY': 0,
                            'PRESENCE_MANUAL': 1,
                            'AI_MANUAL': 2,
                            'AI_PRESENCE_MANUAL': 3
                        }
                        mode_value = mode_map.get(mode_value.upper(), 3)
                
                # AWAIT the coroutine
                await self.switch_service.update_switch_mode(device, event.switch_index, mode_value)
                
                # AI: Analyze mode change
                if self.ai_engine:
                    switch = await self.switch_repo.get_or_create(
                        Switch(device_id=device.id, switch_index=event.switch_index)
                    )
                    # Check if mode change aligns with AI recommendations
                    await self._validate_mode_change(device, switch, mode_value)
                
                return {"status": "updated", "mode": mode_value}

            elif event.type in ["switch", "switch_command"]:
                # Get or create switch
                switch = await self.switch_repo.get_or_create(
                    Switch(device_id=device.id, switch_index=event.switch_index)
                )
                
                # Handle TOGGLE command
                state = event.state
                if state == "TOGGLE":
                    # Need to get current state to toggle - would need to track state
                    # For now, treat as ON
                    state = "ON"
                
                if state == "ON":
                    # Create session
                    session = await self.session_repo.create(
                        Session(switch_id=switch.id, start_time=event.timestamp)
                    )
                    
                    # Pre-fetch prediction - AWAIT this
                    await self.prediction_service.prefetch_prediction(
                        switch.id, f"{device.board_uid}:{event.switch_index}"
                    )
                    
                    # AI: Real-time prediction
                    if self.ai_engine:
                        await self.ai_engine.predict_and_act(device, switch, "ON")
                    
                    return {"status": "session_started", "session_id": session.id}
                    
                elif state == "OFF":
                    # Close session
                    session = await self.session_repo.close_session(switch.id, event.timestamp)
                    if session:
                        await self._process_session_close(session, device, switch)
                        
                        # AI: Analyze completed session and make decisions
                        if self.ai_engine:
                            decisions = await self.ai_engine.process_new_session(
                                session, device, switch
                            )
                            if decisions:
                                logger.info(f"AI made {len(decisions)} decisions for this session")
                    
                    return {"status": "session_closed", "session_id": session.id if session else None}

            elif event.type == "device_command":
                logger.info(f"Device command for {board_uid}: {event.message}")
                # Handle device commands if needed
                if event.message == "STATUS":
                    # Could trigger status response
                    pass
                elif event.message == "RESTART":
                    # Log restart
                    logger.info(f"Device {board_uid} restarting")
                
                return {"status": "command_received"}

            return {"status": "ignored"}

        except Exception as e:
            logger.error(f"Error processing event {event}: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    async def _process_session_close(self, session: Session, device: Device, switch: Switch):
        """
        Process session closure with AI analysis.
        """
        duration = session.duration
        switch_key = f"{device.board_uid}:{switch.switch_index}"
        
        # Get predictions
        predicted = await self.prediction_service.predict(switch_key, session)
        
        # Detect anomalies
        anomaly_result = self.anomaly_service.detect(duration, predicted, session)
        
        # Update trust
        trust_score = self._update_trust(session, anomaly_result, switch_key)
        
        # Calculate energy
        energy_wh = self._calculate_energy(switch, duration)

        # Update session
        session.anomaly = 1 if anomaly_result.get('is_anomaly', False) else 0
        session.anomaly_score = anomaly_result.get('score', 0)
        session.predicted_duration = predicted
        session.trust_score = trust_score
        session.energy_wh = energy_wh
        
        # Add context data
        if self.ai_engine:
            session.context_data = self.ai_engine.context.get_current_context(device.board_uid).to_dict()
        
        # AWAIT the update
        await self.session_repo.update(session)

        # Drift detection
        self.drift_service.add_drift_data(session)

        logger.info(f"Session {session.id} processed: duration={duration:.2f}, "
                   f"anomaly={session.anomaly}, trust={trust_score:.2f}")

    def _update_trust(self, session: Session, anomaly_result: Dict, switch_key: str) -> float:
        """Update trust score based on session outcome"""
        success = not anomaly_result.get('is_anomaly', False)
        context = {
            'switch_key': switch_key,
            'timestamp': session.end_time.isoformat() if session.end_time else None,
            'duration': session.duration,
            'anomaly_score': anomaly_result.get('score', 0)
        }
        return self.trust_agent.update(
            duration=session.duration,
            predicted=session.predicted_duration or 0,
            context=context
        )

    def _calculate_energy(self, switch: Switch, duration: float) -> float:
        """Calculate energy consumption in Wh"""
        return switch.power_rating * (duration / 3600.0)
    
    async def _get_device_switches(self, device_id: int) -> list:
        """Get all switches for a device"""
        # This would query the database
        # Placeholder - implement actual DB query
        with self.session_repo.get_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT * FROM switches WHERE device_id=?", (device_id,))
            rows = c.fetchall()
            return [Switch.from_dict(dict(row)) for row in rows]
    
    async def _validate_mode_change(self, device: Device, switch: Switch, new_mode: int):
        """Validate if mode change aligns with AI recommendations"""
        # Check if this mode matches what AI would recommend
        if self.ai_engine:
            context = self.ai_engine.context.get_current_context(device.board_uid)
            pattern = self.ai_engine.pattern_analyzer.analyze(
                f"{device.board_uid}:{switch.switch_index}", 
                0,  # No duration for mode change
                context.to_dict() if hasattr(context, 'to_dict') else {}
            )
            
            # Log if mode seems suboptimal
            optimal_modes = {
                'night': 1,  # PRESENCE_MANUAL at night
                'weekend': 3,  # AI_PRESENCE_MANUAL on weekends
                'normal': 3   # AI_PRESENCE_MANUAL normally
            }
            
            pattern_type = pattern.get('pattern_type', 'normal')
            suggested = optimal_modes.get(pattern_type, 3)
            
            if new_mode != suggested and pattern.get('confidence', 0) > 0.7:
                logger.info(f"Mode change to {new_mode} differs from AI suggestion {suggested} "
                           f"(pattern: {pattern_type})")
