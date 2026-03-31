from pathlib import Path
from typing import List
import os

class Settings:
    """ALL CONFIGURATION IS HARD-CODED HERE.
    No .env, no environment variables, no external loading."""

    # ====================== BASE PATHS ======================
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    
    # Create data directory if it doesn't exist
    DATA_DIR: Path = BASE_DIR / "data"
    LOG_DIR: Path = BASE_DIR / "logs"
    MODEL_DIR: Path = BASE_DIR / "models"
    
    def __init__(self):
        # Create directories
        self.DATA_DIR.mkdir(exist_ok=True)
        self.LOG_DIR.mkdir(exist_ok=True)
        self.MODEL_DIR.mkdir(exist_ok=True)
        
        # Create subdirectories
        (self.MODEL_DIR / "lstm").mkdir(exist_ok=True)
        (self.MODEL_DIR / "ensemble").mkdir(exist_ok=True)
        (self.MODEL_DIR / "xgboost").mkdir(exist_ok=True)
        
        # Validate MQTT topics
        if not self.MQTT_TOPICS:
            print("Warning: MQTT_TOPICS is empty, using default topics")
            self.MQTT_TOPICS = ["smartroom/#"]

    # ====================== DATABASE ======================
    DB_PATH: Path = DATA_DIR / "smart_ai_system.db"
    
    # ====================== GEOIP ======================
    GEOIP_DB: Path = DATA_DIR / "GeoLite2-City.mmdb"
    ENABLE_GEOIP: bool = True

    # ====================== MQTT ======================
    MQTT_ENABLED: bool = True
    MQTT_BROKER: str = "127.0.0.1"
    MQTT_PORT: int = 1883
    MQTT_USERNAME: str = "AIModel"
    MQTT_PASSWORD: str = "Admin?12345"
    MQTT_KEEPALIVE: int = 60
    MQTT_TOPICS: List[str] = [
        "smartroom/#",
        "smartswitch/+/+/state",
        "smartswitch/+/status",
    ]

    # ====================== DATABASE ======================
    DB_POOL_SIZE: int = 8
    DB_TIMEOUT_SEC: float = 15.0
    DB_RETRY_COUNT: int = 3

    # ====================== ML / PREDICTION ======================
    SEQUENCE_LENGTH: int = 10
    MIN_TRAIN_SAMPLES: int = 30
    TRAIN_EPOCHS: int = 25
    BATCH_SIZE: int = 32
    LEARNING_RATE: float = 0.0008

    # ====================== ANOMALY ======================
    ANOMALY_THRESHOLD: float = 0.62
    ANOMALY_ZSCORE_THRESHOLD: float = 2.8
    CONTEXTUAL_ANOMALY_WEIGHT: float = 0.35

    # ====================== DRIFT ======================
    DRIFT_WINDOW: int = 60
    DRIFT_THRESHOLD: float = 0.38
    DRIFT_PSI_THRESHOLD: float = 0.18

    # ====================== TRUST ======================
    TRUST_INITIAL: float = 0.72
    TRUST_MIN: float = 0.08
    TRUST_MAX: float = 0.96
    TRUST_DECAY_PER_DAY: float = 0.09

    # ====================== ENERGY ======================
    DEFAULT_POWER_WATT: float = 60.0
    ENERGY_COST_PER_KWH: float = 0.142
    CARBON_G_PER_KWH: float = 420.0

    # ====================== FEATURE FLAGS ======================
    ENABLE_ENSEMBLE: bool = True
    ENABLE_CONTEXT_AWARENESS: bool = True
    ENABLE_PATTERN_ANALYSIS: bool = True
    ENABLE_AUTO_RETRAIN: bool = True

    def check_geoip(self) -> bool:
        """Check if GeoIP database exists and enable if it does"""
        if not self.ENABLE_GEOIP:
            return False
        if not self.GEOIP_DB.exists():
            print(f"Warning: GeoIP database not found at {self.GEOIP_DB}")
            print("GeoIP features will be disabled")
            return False
        return True


# Global instance
settings = Settings()

# Post-initialization check
ENABLE_GEOIP = settings.check_geoip()
