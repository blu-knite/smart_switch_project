#include "wifi_manager.h"
#include "logger.h"

WiFiManager wm;

void setupWiFi() {
  WiFi.mode(WIFI_STA);
  
  logSystemEvent("WIFI", "Starting WiFi connection...");
  
  WiFi.begin();
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    logSystemEvent("WIFI", "Connected to: " + WiFi.SSID());
    logSystemEvent("WIFI", "IP: " + WiFi.localIP().toString());
    return;
  }
  
  logSystemEvent("WIFI", "Starting configuration portal...");
  logSystemEvent("WIFI", "Connect to AP: 'SmartSwitch_Setup'");
  
  wm.setConfigPortalTimeout(180);
  wm.setConnectTimeout(30);
  
  if (!wm.autoConnect("SmartSwitch_Setup")) {
    logSystemEvent("WIFI", "Failed to connect. Rebooting...");
    delay(3000);
    ESP.restart();
  }
  
  logSystemEvent("WIFI", "Connected via portal to: " + WiFi.SSID());
  logSystemEvent("WIFI", "IP: " + WiFi.localIP().toString());
}

void handleWiFi() {
  static unsigned long lastCheck = 0;
  
  if (millis() - lastCheck < 30000) return;
  lastCheck = millis();
  
  if (WiFi.status() != WL_CONNECTED) {
    logSystemEvent("WIFI", "Connection lost. Attempting to reconnect...");
    WiFi.reconnect();
  }
}
