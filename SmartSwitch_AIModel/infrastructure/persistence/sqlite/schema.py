import sqlite3
from datetime import datetime

def initialize_schema(conn: sqlite3.Connection):
    """
    Initialize the database schema.
    """
    c = conn.cursor()

    # Devices table
    c.execute("""
    CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        board_uid TEXT UNIQUE,
        ip_address TEXT,
        geo_location TEXT,
        status TEXT,
        firmware_version TEXT,
        last_seen TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Switches table
    c.execute("""
    CREATE TABLE IF NOT EXISTS switches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER,
        switch_index INTEGER,
        mode TEXT DEFAULT 'AUTO',
        power_rating REAL DEFAULT 60,
        min_duration REAL DEFAULT 0,
        max_duration REAL DEFAULT 86400,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(device_id, switch_index),
        FOREIGN KEY (device_id) REFERENCES devices(id)
    )
    """)

    # Switch events table
    c.execute("""
    CREATE TABLE IF NOT EXISTS switch_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        switch_id INTEGER,
        state TEXT,
        source TEXT DEFAULT 'manual',
        timestamp TEXT,
        FOREIGN KEY (switch_id) REFERENCES switches(id)
    )
    """)

    # Sessions table
    c.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        switch_id INTEGER,
        start_time TEXT,
        end_time TEXT,
        duration REAL,
        predicted_duration REAL,
        anomaly INTEGER,
        anomaly_score REAL,
        trust_score REAL,
        energy_wh REAL,
        pattern_cluster INTEGER,
        context_data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (switch_id) REFERENCES switches(id)
    )
    """)

    # Model metadata table
    c.execute("""
    CREATE TABLE IF NOT EXISTS model_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        switch_key TEXT,
        model_type TEXT,
        version INTEGER,
        accuracy REAL,
        trained_at TEXT,
        samples_used INTEGER,
        is_active INTEGER DEFAULT 1,
        UNIQUE(switch_key, model_type, version)
    )
    """)

    # Security events table
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

    # Drift events table
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

    # Context data table
    c.execute("""
    CREATE TABLE IF NOT EXISTS context_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        board_uid TEXT,
        context_type TEXT,
        value TEXT,
        timestamp TEXT
    )
    """)

    # Schema version table
    c.execute("""
    CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT
    )
    """)

    # Create indexes for performance
    c.execute("CREATE INDEX IF NOT EXISTS idx_sessions_switch_id ON sessions(switch_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_switch_events_timestamp ON switch_events(timestamp)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_security_timestamp ON security_events(timestamp)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_drift_detected_at ON drift_events(detected_at)")
    
    conn.commit()