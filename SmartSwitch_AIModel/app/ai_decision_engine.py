"""
AI Decision Engine - Makes intelligent decisions based on all models
and takes actions via MQTT.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
import json

from config.settings import settings
from config.constants import MODE_NAMES, MODE_DESCRIPTIONS
from domain.session import Session
from domain.device import Device
from domain.switch import Switch
from models.ensemble.ensemble_predictor import EnsemblePredictor
from models.lstm.lstm_predictor import LSTMPredictor
from models.context.context_engine import ContextEngine
from models.pattern.pattern_analyzer import PatternAnalyzer
from models.trust.trust_agent import TrustAgent
from models.drift.drift_monitor import DriftMonitor
from infrastructure.mqtt.client import MQTTClient
from infrastructure.persistence.sqlite.repository import SessionRepository, DeviceRepository, SwitchRepository
from app.ai_action_handler import AIActionHandler  # ADD THIS IMPORT

logger = logging.getLogger(__name__)

@dataclass
class AIDecision:
    """Represents an AI decision/action"""
    action_type: str  # 'schedule', 'alert', 'adjust', 'override', 'optimize'
    target_device: str
    target_switch: Optional[int]
    confidence: float
    priority: int  # 1-10 (10 highest)
    payload: Dict[str, Any]
    reason: str
    expires_at: Optional[datetime] = None

class AIDecisionEngine:
    """
    Production AI Decision Engine that:
    - Analyzes patterns and makes predictions
    - Makes autonomous decisions
    - Takes actions via MQTT
    - Learns from outcomes
    - Handles edge cases gracefully
    """
    
    def __init__(self, mqtt_client: MQTTClient):
        self.mqtt_client = mqtt_client
        self.action_handler = AIActionHandler(mqtt_client)  # Now this will work
        self.ensemble = EnsemblePredictor()
        self.lstm = LSTMPredictor()
        self.context = ContextEngine()
        self.pattern_analyzer = PatternAnalyzer()
        self.trust_agent = TrustAgent()
        self.drift_monitor = DriftMonitor()
        self.session_repo = SessionRepository()
        self.device_repo = DeviceRepository()
        self.switch_repo = SwitchRepository()
        
        # Decision history for learning
        self.decision_history: List[Dict[str, Any]] = []
        self.pending_decisions: Dict[str, AIDecision] = {}
        
        # Configuration
        self.min_confidence_threshold = 0.7
        self.max_decisions_per_minute = 10
        self.decision_cooldown_seconds = 30
        
        # Start background tasks
        self.running = True
        asyncio.create_task(self._background_decision_loop())
        asyncio.create_task(self._cleanup_loop())
        
        
    async def process_new_session(self, session: Session, device: Device, switch: Switch):
        """
        Analyze a completed session and make decisions for future actions
        """
        switch_key = f"{device.board_uid}:{switch.switch_index}"
        
        # Get context
        context = self.context.get_current_context(device.board_uid)
        
        # Analyze pattern
        pattern = self.pattern_analyzer.analyze(switch_key, session.duration, context)
        
        # Get trust score
        trust = self.trust_agent.get_trust(switch_key)
        
        # Make decisions based on the session
        decisions = []
        
        # 1. Schedule optimization
        if pattern['pattern_type'] in ['extended', 'normal'] and trust > 0.6:
            schedule_decision = await self._optimize_schedule(
                device, switch, session, pattern, context
            )
            if schedule_decision:
                decisions.append(schedule_decision)
        
        # 2. Anomaly alerts
        if session.anomaly and session.anomaly_score > 0.8:
            alert_decision = self._create_anomaly_alert(
                device, switch, session, context
            )
            decisions.append(alert_decision)
        
        # 3. Energy optimization
        if session.energy_wh and session.energy_wh > 100:  # Significant energy use
            energy_decision = await self._optimize_energy(
                device, switch, session, pattern, context
            )
            if energy_decision:
                decisions.append(energy_decision)
        
        # 4. Mode adjustments based on patterns
        if pattern['is_typical'] and len(pattern.get('recommendations', [])) > 0:
            mode_decision = self._create_mode_adjustment(
                device, switch, pattern, context
            )
            decisions.append(mode_decision)
        
        # Execute decisions
        for decision in decisions:
            await self._execute_decision(decision)
        
        return decisions
    
    async def predict_and_act(self, device: Device, switch: Switch, current_state: str):
        """
        Make real-time predictions and take immediate actions
        Called when a switch changes state
        """
        switch_key = f"{device.board_uid}:{switch.switch_index}"
        
        # Get history
        history = await self._get_switch_history(switch.id)
        
        if len(history) < 10:
            return
        
        # Make predictions
        lstm_pred = self.lstm.predict(switch_key, [s['duration'] for s in history if s.get('duration')])
        ensemble_pred = self.ensemble.predict(switch_key, [s['duration'] for s in history if s.get('duration')])
        
        # Get context
        context = self.context.get_current_context(device.board_uid)
        
        # Get trust
        trust = self.trust_agent.get_trust(switch_key)
        
        actions = []
        
        if current_state == "ON":
            # Predict when it will turn off
            if ensemble_pred and trust > 0.6:
                predicted_off_time = datetime.now() + timedelta(seconds=ensemble_pred)
                
                # Schedule a pre-warning if it's a long duration
                if ensemble_pred > 3600:  # More than 1 hour
                    warning_time = predicted_off_time - timedelta(minutes=5)
                    actions.append(AIDecision(
                        action_type='schedule',
                        target_device=device.board_uid,
                        target_switch=switch.switch_index,
                        confidence=trust,
                        priority=5,
                        payload={
                            'action': 'pre_warning',
                            'message': f"Switch will turn off in 5 minutes",
                            'scheduled_time': warning_time.isoformat()
                        },
                        reason=f"Predicting {ensemble_pred/60:.1f} minute duration"
                    ))
            
        elif current_state == "OFF":
            # Analyze usage pattern for next expected ON time
            next_on = self._predict_next_on(history, context)
            if next_on:
                actions.append(AIDecision(
                    action_type='schedule',
                    target_device=device.board_uid,
                    target_switch=switch.switch_index,
                    confidence=0.8,
                    priority=3,
                    payload={
                        'action': 'expected_on',
                        'predicted_time': next_on.isoformat()
                    },
                    reason="Based on historical patterns"
                ))
        
        # Execute actions
        for action in actions:
            await self._execute_decision(action)
        
        return actions
    
    async def _optimize_schedule(self, device: Device, switch: Switch, 
                                 session: Session, pattern: Dict, 
                                 context: Dict) -> Optional[AIDecision]:
        """Create schedule optimization decision"""
        switch_key = f"{device.board_uid}:{switch.switch_index}"
        
        # Get peak usage hours from pattern
        peak_hours = context.get('temporal', {}).get('active_hours', [])
        
        if not peak_hours:
            return None
        
        # Create optimal schedule
        schedule = {
            'weekday': [],
            'weekend': []
        }
        
        for hour in peak_hours:
            if hour < 8 or hour > 20:  # Night hours
                schedule['weekday'].append({
                    'hour': hour,
                    'action': 'dim',
                    'level': 30
                })
            else:  # Day hours
                schedule['weekday'].append({
                    'hour': hour,
                    'action': 'normal'
                })
        
        return AIDecision(
            action_type='optimize',
            target_device=device.board_uid,
            target_switch=switch.switch_index,
            confidence=0.75,
            priority=4,
            payload={
                'schedule': schedule,
                'based_on': f"{len(peak_hours)} peak hours"
            },
            reason="Optimizing based on usage patterns"
        )
    
    def _create_anomaly_alert(self, device: Device, switch: Switch,
                              session: Session, context: Dict) -> AIDecision:
        """Create alert for anomaly detection"""
        return AIDecision(
            action_type='alert',
            target_device=device.board_uid,
            target_switch=switch.switch_index,
            confidence=0.9,
            priority=8,
            payload={
                'anomaly_score': session.anomaly_score,
                'duration': session.duration,
                'expected_duration': session.predicted_duration,
                'severity': 'high' if session.anomaly_score > 0.9 else 'medium'
            },
            reason=f"Unusual usage pattern detected (score: {session.anomaly_score:.2f})"
        )
    
    async def _optimize_energy(self, device: Device, switch: Switch,
                               session: Session, pattern: Dict,
                               context: Dict) -> Optional[AIDecision]:
        """Create energy optimization decision"""
        # Check if we can suggest energy savings
        if session.energy_wh < 50:  # Low energy use
            return None
        
        savings_potential = session.energy_wh * 0.2  # 20% potential savings
        
        return AIDecision(
            action_type='optimize',
            target_device=device.board_uid,
            target_switch=switch.switch_index,
            confidence=0.7,
            priority=5,
            payload={
                'current_energy': session.energy_wh,
                'savings_potential': savings_potential,
                'suggestion': 'Consider reducing runtime by 20%',
                'estimated_savings': f"${savings_potential/1000 * settings.ENERGY_COST_PER_KWH:.2f}"
            },
            reason=f"High energy usage detected: {session.energy_wh:.1f}Wh"
        )
    
    def _create_mode_adjustment(self, device: Device, switch: Switch,
                                pattern: Dict, context: Dict) -> AIDecision:
        """Create mode adjustment decision"""
        # Determine optimal mode based on pattern
        current_hour = datetime.now().hour
        
        if 22 <= current_hour or current_hour < 6:
            suggested_mode = "NIGHT"
        elif context.get('temporal', {}).get('is_weekend', False):
            suggested_mode = "WEEKEND"
        else:
            suggested_mode = "AUTO"
        
        return AIDecision(
            action_type='adjust',
            target_device=device.board_uid,
            target_switch=switch.switch_index,
            confidence=0.8,
            priority=3,
            payload={
                'current_mode': switch.mode,
                'suggested_mode': suggested_mode,
                'reason': pattern.get('pattern_type', 'normal')
            },
            reason=f"Pattern suggests {suggested_mode} mode"
        )
    
    def _predict_next_on(self, history: List[Dict], context: Dict) -> Optional[datetime]:
        """Predict next time switch will turn on"""
        if len(history) < 10:
            return None
        
        # Analyze historical on times
        on_times = []
        for session in history[-20:]:  # Last 20 sessions
            if session.get('start_time'):
                on_times.append(datetime.fromisoformat(session['start_time']))
        
        if not on_times:
            return None
        
        # Calculate average interval
        if len(on_times) > 1:
            intervals = [(on_times[i] - on_times[i-1]).total_seconds() 
                        for i in range(1, len(on_times))]
            avg_interval = sum(intervals) / len(intervals)
            
            # Predict next on
            last_on = on_times[-1]
            next_on = last_on + timedelta(seconds=avg_interval)
            
            # Don't predict too far in the future
            if next_on > datetime.now() + timedelta(days=7):
                return None
            
            return next_on
        
        return None
    
    async def _get_switch_history(self, switch_id: int, limit: int = 100) -> List[Dict]:
        """Get historical sessions for switch"""
        # This would query the database
        # Placeholder - implement actual DB query
        return []

    async def _execute_decision(self, decision: AIDecision):
        """Execute an AI decision by sending MQTT commands using smartroom format"""
        
        if decision.confidence < self.min_confidence_threshold:
            logger.debug(f"Decision confidence too low: {decision.confidence}")
            return
        
        # Check cooldown
        decision_key = f"{decision.target_device}:{decision.target_switch}:{decision.action_type}"
        if decision_key in self.pending_decisions:
            last_decision = self.pending_decisions[decision_key]
            if last_decision.expires_at and last_decision.expires_at > datetime.now():
                logger.debug(f"Decision still in cooldown: {decision_key}")
                return
        
        # Log decision
        logger.info(f"🤖 Executing AI decision: {decision.action_type} for {decision.target_device} "
                f"(confidence: {decision.confidence:.2f}, priority: {decision.priority})")
        
        try:
            # Execute based on action type using the action handler
            if decision.action_type == 'schedule':
                if decision.target_switch:
                    # Schedule a switch action
                    await self.action_handler.schedule_switch_action(
                        device=Device(board_uid=decision.target_device),
                        switch=Switch(switch_index=decision.target_switch),
                        action=decision.payload.get('action', 'OFF'),
                        scheduled_time=datetime.fromisoformat(decision.payload.get('scheduled_time', datetime.now().isoformat())),
                        confidence=decision.confidence,
                        reason=decision.reason
                    )
                else:
                    # Schedule a device command
                    await self.action_handler.send_command(
                        device=Device(board_uid=decision.target_device),
                        command=json.dumps({'schedule': decision.payload}),
                        confidence=decision.confidence,
                        reason=decision.reason
                    )
                    
            elif decision.action_type == 'alert':
                await self.action_handler.send_alert(
                    device=Device(board_uid=decision.target_device),
                    message=decision.payload.get('message', 'AI Alert'),
                    severity=decision.payload.get('severity', 'medium'),
                    confidence=decision.confidence,
                    reason=decision.reason
                )
                
            elif decision.action_type == 'adjust':
                if decision.target_switch:
                    # Adjust switch mode
                    suggested_mode = decision.payload.get('suggested_mode', 'AUTO')
                    await self.action_handler.set_mode(
                        device=Device(board_uid=decision.target_device),
                        switch=Switch(switch_index=decision.target_switch),
                        mode=suggested_mode,
                        confidence=decision.confidence,
                        reason=decision.reason
                    )
                    
                    # Also set the switch state if needed
                    if 'state' in decision.payload:
                        await self.action_handler.set_switch_state(
                            device=Device(board_uid=decision.target_device),
                            switch=Switch(switch_index=decision.target_switch),
                            state=decision.payload['state'],
                            confidence=decision.confidence,
                            reason=decision.reason
                        )
                else:
                    # Adjust device-wide settings
                    await self.action_handler.send_command(
                        device=Device(board_uid=decision.target_device),
                        command=json.dumps({'config': decision.payload}),
                        confidence=decision.confidence,
                        reason=decision.reason
                    )
                    
            elif decision.action_type == 'override':
                if decision.target_switch:
                    # Override switch state
                    await self.action_handler.set_switch_state(
                        device=Device(board_uid=decision.target_device),
                        switch=Switch(switch_index=decision.target_switch),
                        state=decision.payload.get('state', 'OFF'),
                        confidence=decision.confidence,
                        reason=decision.reason
                    )
                    
            elif decision.action_type == 'optimize':
                if 'schedule' in decision.payload:
                    # Send optimization schedule
                    await self.action_handler.send_command(
                        device=Device(board_uid=decision.target_device),
                        command=json.dumps({'optimize': decision.payload}),
                        confidence=decision.confidence,
                        reason=decision.reason
                    )
                    
                    # Also set individual switch modes if specified
                    if decision.target_switch:
                        await self.action_handler.set_mode(
                            device=Device(board_uid=decision.target_device),
                            switch=Switch(switch_index=decision.target_switch),
                            mode='ECO',
                            confidence=decision.confidence,
                            reason=f"Energy optimization: {decision.reason}"
                        )
            
            # Store decision
            decision.expires_at = datetime.now() + timedelta(seconds=self.decision_cooldown_seconds)
            self.pending_decisions[decision_key] = decision
            
            # Add to history
            self.decision_history.append({
                'timestamp': datetime.now().isoformat(),
                'decision': decision.__dict__,
                'executed': True
            })
            
            # Keep history manageable
            if len(self.decision_history) > 1000:
                self.decision_history = self.decision_history[-1000:]
                
        except Exception as e:
            logger.error(f"Failed to execute decision: {e}")
            self.decision_history.append({
                'timestamp': datetime.now().isoformat(),
                'decision': decision.__dict__,
                'executed': False,
                'error': str(e)
            })
        
    async def _background_decision_loop(self):
        """
        Background task that periodically makes proactive decisions
        """
        while self.running:
            try:
                # Get all active devices
                devices = await self._get_active_devices()
                
                for device in devices:
                    # Get device context
                    context = self.context.get_current_context(device.board_uid)
                    
                    # Check for time-based decisions
                    decisions = await self._check_time_based_decisions(device, context)
                    
                    for decision in decisions:
                        await self._execute_decision(decision)
                    
                    # Small delay between devices
                    await asyncio.sleep(1)
                
                # Wait before next cycle
                await asyncio.sleep(300)  # 5 minutes
                
            except Exception as e:
                logger.error(f"Background decision loop error: {e}")
                await asyncio.sleep(60)
    
    async def _check_time_based_decisions(self, device: Device, context: Dict) -> List[AIDecision]:
        """Check for time-based decisions (e.g., turn off at night)"""
        decisions = []
        
        current_hour = datetime.now().hour
        
        # Night time checks
        if current_hour >= 23 or current_hour <= 5:
            # Get all switches for device
            switches = await self._get_device_switches(device.id)
            
            for switch in switches:
                # Check if switch is likely on (would need state tracking)
                # For now, just suggest night mode
                decisions.append(AIDecision(
                    action_type='adjust',
                    target_device=device.board_uid,
                    target_switch=switch.switch_index,
                    confidence=0.8,
                    priority=6,
                    payload={
                        'suggested_mode': 'NIGHT',
                        'reason': 'Late night hours'
                    },
                    reason="Energy saving during night hours"
                ))
        
        return decisions
    
    async def _get_active_devices(self) -> List[Device]:
        """Get list of active devices"""
        # This would query the database
        # Placeholder - implement actual DB query
        return []
    
    async def _get_device_switches(self, device_id: int) -> List[Switch]:
        """Get switches for a device"""
        # This would query the database
        # Placeholder - implement actual DB query
        return []
    
    async def _cleanup_loop(self):
        """Clean up expired decisions"""
        while self.running:
            try:
                now = datetime.now()
                expired = []
                
                for key, decision in self.pending_decisions.items():
                    if decision.expires_at and decision.expires_at < now:
                        expired.append(key)
                
                for key in expired:
                    del self.pending_decisions[key]
                
                await asyncio.sleep(60)  # Clean up every minute
                
            except Exception as e:
                logger.error(f"Cleanup loop error: {e}")
                await asyncio.sleep(60)
    
    def get_decision_stats(self) -> Dict[str, Any]:
        """Get statistics about decisions made"""
        return {
            'total_decisions': len(self.decision_history),
            'pending_decisions': len(self.pending_decisions),
            'decisions_last_hour': len([
                d for d in self.decision_history[-60:] 
                if datetime.fromisoformat(d['timestamp']) > datetime.now() - timedelta(hours=1)
            ]),
            'action_types': self._count_action_types()
        }
    
    def _count_action_types(self) -> Dict[str, int]:
        """Count decisions by action type"""
        counts = {}
        for d in self.decision_history:
            action = d['decision'].get('action_type', 'unknown')
            counts[action] = counts.get(action, 0) + 1
        return counts
    
    def stop(self):
        """Stop the decision engine"""
        self.running = False
        logger.info("AI Decision Engine stopped")

    async def _optimize_mode(self, device: Device, switch: Switch, 
                         session: Session, context: Dict) -> Optional[AIDecision]:
        """Optimize switch mode based on usage patterns and context"""
        
        switch_key = f"{device.board_uid}:{switch.switch_index}"
        trust = self.trust_agent.get_trust(switch_key)
        
        # Let the action handler recommend optimal mode
        recommended_mode = await self.action_handler.recommend_mode(device, switch, {
            'temporal': context.get('temporal', {}),
            'trust_score': trust,
            'session_duration': session.duration if session else None,
            'anomaly_score': session.anomaly_score if session else 0
        })
        
        current_mode = switch.mode if hasattr(switch, 'mode') else None
        
        # Only recommend if different from current mode
        if current_mode != recommended_mode:
            mode_name = self.action_handler._get_mode_name(recommended_mode)
            mode_desc = self.action_handler._get_mode_description(recommended_mode)
            
            return AIDecision(
                action_type='adjust',
                target_device=device.board_uid,
                target_switch=switch.switch_index,
                confidence=trust * 0.9,  # Slightly discount based on trust
                priority=6,
                payload={
                    'suggested_mode': recommended_mode,
                    'current_mode': current_mode,
                    'mode_name': mode_name,
                    'description': mode_desc,
                    'reason': f"Optimizing based on usage patterns"
                },
                reason=f"Switching to {mode_name} mode for optimal operation"
            )
        
        return None
