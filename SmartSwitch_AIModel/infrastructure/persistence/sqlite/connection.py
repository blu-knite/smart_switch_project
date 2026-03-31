import sqlite3
import os
from contextlib import contextmanager
from typing import Generator
from pathlib import Path

from config.settings import settings

def ensure_db_directory():
    """Ensure the database directory exists"""
    db_path = Path(settings.DB_PATH)
    db_dir = db_path.parent
    if not db_dir.exists():
        db_dir.mkdir(parents=True, exist_ok=True)
        print(f"Created database directory: {db_dir}")

@contextmanager
def get_connection() -> Generator[sqlite3.Connection, None, None]:
    """Get database connection with proper path handling"""
    # Ensure directory exists
    ensure_db_directory()
    
    # Convert to string for sqlite3
    db_path_str = str(settings.DB_PATH)
    
    conn = None
    try:
        conn = sqlite3.connect(db_path_str, timeout=settings.DB_TIMEOUT_SEC)
        conn.row_factory = sqlite3.Row
        yield conn
        conn.commit()
    except sqlite3.OperationalError as e:
        print(f"Database connection error: {e}")
        print(f"Attempted path: {db_path_str}")
        raise
    finally:
        if conn:
            conn.close()

def init_database():
    """Initialize the database with schema"""
    # Import here to avoid circular imports
    from .schema import initialize_schema
    from .migrations.v1_initial import migrate_v1
    from .migrations.v2_enhancements import migrate_v2
    
    # Ensure directory exists first
    ensure_db_directory()
    
    print(f"Initializing database at: {settings.DB_PATH}")
    
    with get_connection() as conn:
        # Initialize schema first
        initialize_schema(conn)
        print("Schema initialized")
        
        # Run migrations
        try:
            migrate_v1(conn)
            print("Migration v1 completed")
        except Exception as e:
            print(f"Migration v1 warning (may already be applied): {e}")
        
        try:
            migrate_v2(conn)
            print("Migration v2 completed")
        except Exception as e:
            print(f"Migration v2 warning (may already be applied): {e}")
        
        print(f"Database initialization complete at: {settings.DB_PATH}")