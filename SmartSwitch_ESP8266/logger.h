#ifndef LOGGER_H
#define LOGGER_H

#include <Arduino.h>

// Log levels
enum LogLevel {
  LOG_INFO,
  LOG_WARNING,
  LOG_ERROR,
  LOG_DEBUG
};

// Unified log function
void logMessage(LogLevel level, const String& component, const String& message);
void logMessage(LogLevel level, const String& component, const String& format, int value);
void logMessage(LogLevel level, const String& component, const String& format, float value);

// Convenience macros
#define LOG_I(comp, msg) logMessage(LOG_INFO, comp, msg)
#define LOG_W(comp, msg) logMessage(LOG_WARNING, comp, msg)
#define LOG_E(comp, msg) logMessage(LOG_ERROR, comp, msg)
#define LOG_D(comp, msg) logMessage(LOG_DEBUG, comp, msg)

// Switch-specific logging
void logSwitchState(uint8_t relay, const String& action, bool state);
void logSwitchMode(uint8_t relay, uint8_t mode);
void logSwitchEvent(uint8_t relay, const String& source, const String& event);

// System logging
void logSystemEvent(const String& event, const String& details);
void logBootMessage(const String& deviceID);

#endif
