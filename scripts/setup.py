#!/usr/bin/env python3
"""
Setup script to create necessary directories and files.
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import settings

def setup_directories():
    """Create all necessary directories"""
    print("Creating directories...")
    
    dirs = [
        settings.DATA_DIR,
        settings.LOG_DIR,
        settings.MODEL_DIR,
        settings.MODEL_DIR / "lstm",
        settings.MODEL_DIR / "ensemble",
        settings.MODEL_DIR / "xgboost",
    ]
    
    for dir_path in dirs:
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f"  Created: {dir_path}")
    
    print("\nDirectory setup complete!")

def check_geoip():
    """Check if GeoIP database exists"""
    geoip_path = settings.GEOIP_DB
    if geoip_path.exists():
        print(f"✓ GeoIP database found: {geoip_path}")
    else:
        print(f"⚠ GeoIP database not found: {geoip_path}")
        print("  Download from: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data")
        print("  Or disable ENABLE_GEOIP in config/settings.py")

def check_files():
    """Check if all required files exist"""
    print("\nChecking required files...")
    
    required_files = [
        ("schema.py", Path(__file__).parent.parent / "infrastructure" / "persistence" / "sqlite" / "schema.py"),
        ("v1_initial.py", Path(__file__).parent.parent / "infrastructure" / "persistence" / "sqlite" / "migrations" / "v1_initial.py"),
        ("v2_enhancements.py", Path(__file__).parent.parent / "infrastructure" / "persistence" / "sqlite" / "migrations" / "v2_enhancements.py"),
    ]
    
    all_good = True
    for name, path in required_files:
        if path.exists():
            print(f"✓ {name} found")
        else:
            print(f"✗ {name} missing at: {path}")
            all_good = False
    
    return all_good

def main():
    """Main setup function"""
    print("=" * 50)
    print("AI Smart Switch System - Setup")
    print("=" * 50)
    
    # Create directories
    setup_directories()
    
    # Check files
    if not check_files():
        print("\n⚠ Some required files are missing. Please check the paths above.")
        return
    
    # Check GeoIP
    check_geoip()
    
    # Initialize database
    print("\nInitializing database...")
    try:
        from infrastructure.persistence.sqlite.connection import init_database
        init_database()
        print("✓ Database initialized")
    except Exception as e:
        print(f"✗ Database initialization failed: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 50)
    print("Setup complete! You can now run the system:")
    print("  python run.py")
    print("=" * 50)

if __name__ == "__main__":
    main()