#include "presence_manager.h"
#include "config.h"
#include "logger.h"

// Presence state machine
enum PresenceState {
  STATE_IDLE,
  STATE_DETECTING,
  STATE_PRESENT,
  STATE_ABSENT
};

static PresenceState currentState = STATE_IDLE;
static unsigned long stateStartTime = 0;
static bool rawSensorState = false;
static unsigned long lastRawChange = 0;

void setupPresence() {
  pinMode(PRESENCE_PIN, INPUT_PULLUP);
  logSystemEvent("PRESENCE", "Sensor initialized with pull-up");
}

void updatePresence() {
  // Read raw sensor
  bool currentRaw = digitalRead(PRESENCE_PIN);
  
  // Debounce raw input
  if (currentRaw != rawSensorState) {
    rawSensorState = currentRaw;
    lastRawChange = millis();
  }
  
  // Only process if input is stable
  if (millis() - lastRawChange < PRESENCE_INPUT_DEBOUNCE_MS) {
    return;
  }
  
  unsigned long now = millis();
  
  // State machine for presence filtering
  switch (currentState) {
    case STATE_IDLE:
      if (rawSensorState) {
        currentState = STATE_DETECTING;
        stateStartTime = now;
        LOG_D("PRESENCE", "Motion detected, stabilizing...");
      }
      break;
      
    case STATE_DETECTING:
      if (!rawSensorState) {
        currentState = STATE_IDLE;
        LOG_D("PRESENCE", "Motion stopped during stabilization");
      } else if (now - stateStartTime >= PRESENCE_ON_DELAY_MS) {
        currentState = STATE_PRESENT;
        stateStartTime = now;
        LOG_I("PRESENCE", "Human presence CONFIRMED");
      }
      break;
      
    case STATE_PRESENT:
      if (!rawSensorState) {
        currentState = STATE_ABSENT;
        stateStartTime = now;
        LOG_D("PRESENCE", "No motion, waiting for absence confirmation...");
      }
      break;
      
    case STATE_ABSENT:
      if (rawSensorState) {
        currentState = STATE_DETECTING;
        stateStartTime = now;
        LOG_D("PRESENCE", "Motion detected during absence");
      } else if (now - stateStartTime >= PRESENCE_OFF_DELAY_MS) {
        currentState = STATE_IDLE;
        LOG_I("PRESENCE", "Human presence CLEARED");
      }
      break;
  }
}

bool isHumanPresent() {
  return (currentState == STATE_PRESENT);
}

String getPresenceState() {
  switch(currentState) {
    case STATE_IDLE:      return "IDLE";
    case STATE_DETECTING: return "DETECTING";
    case STATE_PRESENT:   return "PRESENT";
    case STATE_ABSENT:    return "ABSENT";
    default:              return "UNKNOWN";
  }
}
