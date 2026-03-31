#ifndef DEVICE_CONTROL_H
#define DEVICE_CONTROL_H

#include <Arduino.h>
#include "config.h"

// Mode names for display
extern const char* modeNames[];
extern const uint8_t modeCount;

// Mode states
extern uint8_t switchMode[2];
extern bool relayState[2];
extern bool lastRelayState[2];
extern bool manualLock[2];
extern unsigned long lastManualTime[2];

// Mode change tracking
extern bool modeChanged[2];
extern unsigned long lastModeChange[2];

// Function declarations
void setupRelays();
void setRelay(uint8_t relay, bool state, const String& source = "AUTO");
void toggleRelay(uint8_t relay);
void setSwitchMode(uint8_t relay, uint8_t mode, const String& source = "MQTT");
void runModeLogic();
void publishState(uint8_t relay);
void publishMode(uint8_t relay);

// Mode helpers
bool isPresenceMode(uint8_t mode);
bool isAIMode(uint8_t mode);
String getModeName(uint8_t mode);
uint8_t getModeFromName(const String& modeName);

#endif
