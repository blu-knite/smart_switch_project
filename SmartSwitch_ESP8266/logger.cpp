#include "logger.h"
#include "config.h"
#include <PubSubClient.h>

extern PubSubClient mqttClient;
extern String deviceID;

// Component name formatter
String getComponentName(const String& base, uint8_t relay = 255) {
  if (relay < 2) {
    return "SW" + String(relay + 1) + ":" + base;
  }
  return "SYS:" + base;
}

// Timestamp formatter
String getFormattedTimestamp() {
  unsigned long ms = millis();
  unsigned long seconds = ms / 1000;
  unsigned long minutes = seconds / 60;
  unsigned long hours = minutes / 60;
  
  char buffer[20];
  if (hours > 0) {
    sprintf(buffer, "%02lu:%02lu:%02lu", hours, minutes % 60, seconds % 60);
  } else if (minutes > 0) {
    sprintf(buffer, "%02lu:%02lu", minutes, seconds % 60);
  } else {
    sprintf(buffer, "%lu.%03lus", seconds, ms % 1000);
  }
  return String(buffer);
}

// Log level to string
const char* logLevelToString(LogLevel level) {
  switch(level) {
    case LOG_INFO:    return "INFO";
    case LOG_WARNING: return "WARN";
    case LOG_ERROR:   return "ERR ";
    case LOG_DEBUG:   return "DEBUG";
    default:          return "UNK ";
  }
}

// Core logging function
void logMessage(LogLevel level, const String& component, const String& message) {
  String timestamp = getFormattedTimestamp();
  String logEntry = "[" + timestamp + "][" + logLevelToString(level) + "][" + component + "] " + message;
  
  // Serial output with color coding (optional, for Serial monitor)
  Serial.println(logEntry);
  
  // MQTT output (unified format)
  if (mqttClient.connected()) {
    String topic = "smartroom/" + deviceID + "/logs";
    mqttClient.publish(topic.c_str(), logEntry.c_str());
  }
}

void logMessage(LogLevel level, const String& component, const String& format, int value) {
  char buffer[64];
  snprintf(buffer, sizeof(buffer), format.c_str(), value);
  logMessage(level, component, String(buffer));
}

void logMessage(LogLevel level, const String& component, const String& format, float value) {
  char buffer[64];
  snprintf(buffer, sizeof(buffer), format.c_str(), value);
  logMessage(level, component, String(buffer));
}

// Switch state logging
void logSwitchState(uint8_t relay, const String& action, bool state) {
  String component = getComponentName("CTRL", relay);
  String message = action + " → " + String(state ? "ON" : "OFF");
  logMessage(LOG_INFO, component, message);
}

// Switch mode logging
void logSwitchMode(uint8_t relay, uint8_t mode) {
  String component = getComponentName("MODE", relay);
  const char* modeNames[] = {"MANUAL", "PRESENCE", "AI", "AI+PRESENCE"};
  String message = "Mode changed to " + String(modeNames[mode]) + " (" + String(mode) + ")";
  logMessage(LOG_INFO, component, message);
}

// Switch event logging
void logSwitchEvent(uint8_t relay, const String& source, const String& event) {
  String component = getComponentName(source, relay);
  logMessage(LOG_INFO, component, event);
}

// System event logging
void logSystemEvent(const String& event, const String& details) {
  String message = event + ": " + details;
  logMessage(LOG_INFO, "SYS", message);
}

// Boot message
void logBootMessage(const String& deviceID) {
  Serial.println();
  Serial.println("╔══════════════════════════════════════╗");
  Serial.println("║     SmartSwitch Dual Relay v1.0      ║");
  Serial.println("╠══════════════════════════════════════╣");
  Serial.println("║ Device: " + deviceID + "             ║");
  Serial.println("╚══════════════════════════════════════╝");
  Serial.println();
  
  logMessage(LOG_INFO, "SYS", "System boot complete");
  logMessage(LOG_INFO, "SYS", "Modes: 0=MANUAL, 1=PRESENCE, 2=AI, 3=AI+PRESENCE");
}
