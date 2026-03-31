from datetime import datetime, timedelta
import asyncio

from infrastructure.persistence.sqlite.connection import get_connection

async def cleanup_old_data(days: int = 90):
    """
    Async cleanup of old data.
    """
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()
    with get_connection() as conn:
        c = conn.cursor()
        c.execute("DELETE FROM sessions WHERE start_time < ?", (cutoff,))
        conn.commit()