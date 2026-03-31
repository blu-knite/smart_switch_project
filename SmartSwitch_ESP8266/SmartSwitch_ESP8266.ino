#include "config.h"
#include "device_control.h"
#include "presence_manager.h"
#include "touch_manager.h"
#include "mqtt_manager.h"
#include "wifi_manager.h"
#include "logger.h"

String deviceID;

void setup() {
  Serial.begin(115200);
  delay(500);
  
  // Generate unique device ID
  uint32_t chipid = ESP.getChipId();
  deviceID = "SmartSwitch_" + String(chipid, HEX);

  pinMode(LED_PIN, OUTPUT);

  // Boot sequence
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, LOW);
    delay(200);
    digitalWrite(LED_PIN, HIGH);
    delay(200);
  }

  // Display boot message
  logBootMessage(deviceID);
  
  LOG_I("SYS", "Chip ID: 0x" + String(chipid, HEX));
  LOG_I("SYS", "Free heap: " + String(ESP.getFreeHeap()) + " bytes");

  // Initialize hardware
  setupRelays();
  setupPresence();
  setupTouch();

  // Connect to WiFi
  LOG_I("SYS", "Starting WiFi connection...");
  setupWiFi();
  
  // Setup MQTT
  LOG_I("SYS", "Initializing MQTT...");
  setupMQTT();

  LOG_I("SYS", "System ready");
  LOG_I("SYS", "──────────────────────────────────");
}

void loop() {
  handleWiFi();        // Check WiFi connection
  maintainMQTT();      // Handle MQTT
  updatePresence();    // Update presence detection
  updateTouch();       // Check touch inputs
  runModeLogic();      // Apply automation logic
  
  delay(10);
}
