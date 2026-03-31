import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from config.settings import settings

def setup_logging():
    """Setup logging with proper directory creation"""
    log_dir = settings.LOG_DIR
    log_dir.mkdir(exist_ok=True)
    
    log_file = log_dir / "ai_system.log"
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s'
    )
    simple_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        log_file, 
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(detailed_formatter)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(simple_formatter)
    
    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
    
    # Log startup
    logging.info(f"Logging initialized. Log file: {log_file}")
    logging.info(f"Database path: {settings.DB_PATH}")
    logging.info(f"Data directory: {settings.DATA_DIR}")

logger = logging.getLogger(__name__)