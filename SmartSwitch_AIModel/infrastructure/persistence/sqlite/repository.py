import sqlite3
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import asyncio
from functools import partial

from domain.device import Device
from domain.switch import Switch
from domain.session import Session
from .connection import get_connection

# Helper to run sync DB operations in thread pool
async def run_sync(func, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: func(*args, **kwargs))

class DeviceRepository:
    def _get_or_create_sync(self, device: Device) -> Device:
        """Synchronous version"""
        with get_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT id FROM devices WHERE board_uid=?", (device.board_uid,))
            row = c.fetchone()
            if row:
                device.id = row[0]
                self._update_last_seen_sync(conn, device.id)
                return device
            c.execute("""
                INSERT INTO devices (board_uid, status, last_seen, created_at)
                VALUES (?, ?, ?, ?)
            """, (device.board_uid, device.status, 
                  device.last_seen.isoformat() if device.last_seen else None,
                  datetime.now().isoformat()))
            device.id = c.lastrowid
            conn.commit()
            return device
    
    async def get_or_create(self, device: Device) -> Device:
        """Async version"""
        return await run_sync(self._get_or_create_sync, device)
    
    def _update_last_seen_sync(self, conn: sqlite3.Connection, device_id: int):
        c = conn.cursor()
        c.execute("UPDATE devices SET last_seen=? WHERE id=?", 
                  (datetime.now().isoformat(), device_id))
        conn.commit()
    
    async def update_last_seen(self, device_id: int):
        """Update last seen time"""
        with get_connection() as conn:
            c = conn.cursor()
            c.execute("UPDATE devices SET last_seen=? WHERE id=?", 
                      (datetime.now().isoformat(), device_id))
            conn.commit()


class SwitchRepository:
    def _get_or_create_sync(self, switch: Switch) -> Switch:
        with get_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT id FROM switches WHERE device_id=? AND switch_index=?", 
                     (switch.device_id, switch.switch_index))
            row = c.fetchone()
            if row:
                switch.id = row[0]
                return switch
            c.execute("""
                INSERT INTO switches (device_id, switch_index, power_rating, created_at)
                VALUES (?, ?, ?, ?)
            """, (switch.device_id, switch.switch_index, switch.power_rating, 
                  datetime.now().isoformat()))
            switch.id = c.lastrowid
            conn.commit()
            return switch
    
    async def get_or_create(self, switch: Switch) -> Switch:
        return await run_sync(self._get_or_create_sync, switch)
    
    def _update_mode_sync(self, switch_id: int, mode: int):
        with get_connection() as conn:
            c = conn.cursor()
            c.execute("UPDATE switches SET mode=? WHERE id=?", (mode, switch_id))
            conn.commit()
    
    async def update_mode(self, switch_id: int, mode: int):
        """Update switch mode"""
        await run_sync(self._update_mode_sync, switch_id, mode)


class SessionRepository:
    def _create_sync(self, session: Session) -> Session:
        with get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                INSERT INTO sessions (switch_id, start_time, created_at)
                VALUES (?, ?, ?)
            """, (session.switch_id, session.start_time.isoformat(), 
                  datetime.now().isoformat()))
            session.id = c.lastrowid
            conn.commit()
            return session
    
    async def create(self, session: Session) -> Session:
        return await run_sync(self._create_sync, session)
    
    def _close_session_sync(self, switch_id: int, end_time: datetime) -> Optional[Session]:
        with get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                SELECT id, start_time FROM sessions
                WHERE switch_id=? AND end_time IS NULL
                ORDER BY start_time DESC LIMIT 1
            """, (switch_id,))
            row = c.fetchone()
            if row:
                session_id, start_time_str = row
                start_time = datetime.fromisoformat(start_time_str)
                duration = (end_time - start_time).total_seconds()
                c.execute("""
                    UPDATE sessions SET end_time=?, duration=?
                    WHERE id=?
                """, (end_time.isoformat(), duration, session_id))
                conn.commit()
                return Session(id=session_id, start_time=start_time, 
                             end_time=end_time, duration=duration, switch_id=switch_id)
            return None
    
    async def close_session(self, switch_id: int, end_time: datetime) -> Optional[Session]:
        return await run_sync(self._close_session_sync, switch_id, end_time)
    
    def _update_sync(self, session: Session):
        with get_connection() as conn:
            c = conn.cursor()
            context_data = None
            if hasattr(session, 'context_data') and session.context_data:
                if hasattr(session.context_data, 'to_dict'):
                    context_data = json.dumps(session.context_data.to_dict())
                else:
                    context_data = json.dumps(session.context_data)
            
            c.execute("""
                UPDATE sessions SET
                    end_time=?, duration=?, predicted_duration=?, anomaly=?,
                    anomaly_score=?, trust_score=?, energy_wh=?, pattern_cluster=?,
                    context_data=?
                WHERE id=?
            """, (
                session.end_time.isoformat() if session.end_time else None,
                session.duration,
                session.predicted_duration,
                session.anomaly,
                session.anomaly_score,
                session.trust_score,
                session.energy_wh,
                session.pattern_cluster,
                context_data,
                session.id
            ))
            conn.commit()
    
    async def update(self, session: Session):
        await run_sync(self._update_sync, session)
    
    async def get_history(self, switch_id: int, limit: int = 100) -> List[Dict]:
        """Get session history for switch"""
        with get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                SELECT duration, start_time, end_time, anomaly_score
                FROM sessions
                WHERE switch_id=? AND end_time IS NOT NULL
                ORDER BY start_time DESC
                LIMIT ?
            """, (switch_id, limit))
            rows = c.fetchall()
            return [dict(row) for row in rows]
