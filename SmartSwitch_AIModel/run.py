#!/usr/bin/env python3
import asyncio
import logging
import sys
from pathlib import Path
import subprocess
import os

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from config.settings import settings
from app.core import EventProcessor
from app.mqtt_handler import MQTTHandler
from app.background_tasks import BackgroundTaskManager
from infrastructure.logging import setup_logging
from infrastructure.persistence.sqlite.connection import init_database

# Try to import uvicorn for API server
try:
    import uvicorn
    HAS_UVICORN = True
except ImportError:
    HAS_UVICORN = False
    print("Warning: uvicorn not installed. API server will not start.")
    print("Install with: pip install uvicorn fastapi")

async def start_api_server():
    """Start the FastAPI server in a subprocess"""
    if not HAS_UVICORN:
        return None
    
    api_script = Path(__file__).parent / "api_server.py"
    if not api_script.exists():
        print(f"Warning: API server script not found at {api_script}")
        return None
    
    # Start API server as subprocess
    env = os.environ.copy()
    env["PYTHONPATH"] = str(Path(__file__).parent)
    
    process = subprocess.Popen(
        [sys.executable, str(api_script)],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    
    print(f"API server started with PID: {process.pid}")
    return process

async def main():
    """Main entry point"""
    try:
        # Setup logging first
        setup_logging()
        logger = logging.getLogger(__name__)

        print("=" * 60)
        print("AI SMART SWITCH SYSTEM - PRODUCTION MODE")
        print("=" * 60)
        print(f"Base directory: {settings.BASE_DIR}")
        print(f"Database path: {settings.DB_PATH}")
        print(f"MQTT Broker: {settings.MQTT_BROKER}:{settings.MQTT_PORT}")
        print(f"AI Features: Ensemble={settings.ENABLE_ENSEMBLE}, "
              f"Context={settings.ENABLE_CONTEXT_AWARENESS}, "
              f"Pattern={settings.ENABLE_PATTERN_ANALYSIS}")
        print("=" * 60)

        # Initialize database
        print("Initializing database...")
        init_database()
        print("Database initialized successfully")

        # Start API server
        print("Starting AI API server on port 10006...")
        api_process = await start_api_server()

        # Start background tasks
        print("Starting background tasks...")
        BackgroundTaskManager().start()

        # Start MQTT with AI-enabled handler
        if settings.MQTT_ENABLED:
            print(f"Starting AI-enabled MQTT handler (broker: {settings.MQTT_BROKER}:{settings.MQTT_PORT})...")
            handler = MQTTHandler()  # No processor needed - it creates its own
            await handler.run()
        else:
            print("Starting file mode...")
            processor = EventProcessor()
            from app.session_manager import process_file_logs
            await process_file_logs(processor)

    except KeyboardInterrupt:
        print("\nShutting down...")
        if 'api_process' in locals() and api_process:
            api_process.terminate()
            api_process.wait()
    except Exception as e:
        logging.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
