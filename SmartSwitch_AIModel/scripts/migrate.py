#!/usr/bin/env python3
"""
Run database migrations.
"""

from infrastructure.persistence.sqlite.connection import get_connection
from infrastructure.persistence.sqlite.migrations.v1_initial import migrate_v1
from infrastructure.persistence.sqlite.migrations.v2_enhancements import migrate_v2

def run_migrations():
    with get_connection() as conn:
        migrate_v1(conn)
        migrate_v2(conn)
    print("Migrations completed.")

if __name__ == "__main__":
    run_migrations()