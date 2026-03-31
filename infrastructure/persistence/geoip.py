import geoip2.database
from typing import Optional, Dict, Any
from pathlib import Path

from config.settings import settings, ENABLE_GEOIP

class GeoIPService:
    def __init__(self):
        self.reader = None
        self.enabled = ENABLE_GEOIP
        
        if self.enabled:
            try:
                self.reader = geoip2.database.Reader(str(settings.GEOIP_DB))
                print(f"GeoIP enabled with database: {settings.GEOIP_DB}")
            except Exception as e:
                print(f"GeoIP initialization error: {e}")
                self.enabled = False
        else:
            print("GeoIP is disabled")

    def geolocate(self, ip: str) -> Optional[Dict[str, Any]]:
        """Geolocate IP address"""
        if not self.enabled or not self.reader:
            return None
            
        try:
            response = self.reader.city(ip)
            return {
                'city': response.city.name,
                'country': response.country.name,
                'latitude': response.location.latitude,
                'longitude': response.location.longitude,
                'timezone': response.location.time_zone,
            }
        except Exception as e:
            # Don't print for local IPs
            if not ip.startswith(('127.', '192.168.', '10.')):
                print(f"GeoIP lookup error for {ip}: {e}")
            return None

    def is_enabled(self) -> bool:
        """Check if GeoIP is enabled"""
        return self.enabled


# Global instance
geoip_service = GeoIPService()