import sqlite3
from datetime import datetime
from ..schema import initialize_schema  # Add this if v2 also needs schema

def migrate_v2(conn: sqlite3.Connection):
    """
    Migration v2: add security and drift tables.
    """
    c = conn.cursor()

    # Security events
    c.execute("""
    CREATE TABLE IF NOT EXISTS security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        board_uid TEXT,
        event_type TEXT,
        score REAL,
        details TEXT,
        timestamp TEXT
    )
    """)

    # Drift events
    c.execute("""
    CREATE TABLE IF NOT EXISTS drift_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        switch_key TEXT,
        drift_score REAL,
        p_value REAL,
        detected_at TEXT
    )
    """)

    # Energy consumption table
    c.execute("""
    CREATE TABLE IF NOT EXISTS energy_consumption (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        switch_id INTEGER,
        date TEXT,
        energy_wh REAL,
        cost REAL,
        carbon_g REAL,
        FOREIGN KEY (switch_id) REFERENCES switches(id)
    )
    """)

    # Update schema version
    c.execute("INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (2, ?)", (datetime.now().isoformat(),))
    conn.commit()