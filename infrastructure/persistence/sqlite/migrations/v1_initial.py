import sqlite3
from datetime import datetime
from ..schema import initialize_schema  # Fix: import from parent directory

def migrate_v1(conn: sqlite3.Connection):
    """
    Initial migration: create core tables.
    """
    initialize_schema(conn)
    # Log migration
    c = conn.cursor()
    c.execute("""
    CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT
    )
    """)
    c.execute("INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (1, ?)", (datetime.now().isoformat(),))
    conn.commit()