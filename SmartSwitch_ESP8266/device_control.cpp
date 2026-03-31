#include "device_control.h"
#include "config.h"
#include "logger.h"
#include "presence_manager.h"
#include <PubSubClient.h>

extern PubSubClient mqttClient;
extern String deviceID;

// Mode names for display and web panel
const char* modeNames[] = {"Manual", "Presence", "AI", "AI+Presence"};
const uint8_t modeCount = 4;

uint8_t switchMode[2] = {MODE_MANUAL_ONLY, MODE_MANUAL_ONLY};
bool relayState[2] = {false, false};
bool lastRelayState[2] = {false, false};
bool manualLock[2] = {false, false};
unsigned long lastManualTime[2] = {0, 0};  // Track when manual lock was set

// Mode change tracking
bool modeChanged[2] = {false, false};
unsigned long lastModeChange[2] = {0, 0};

// Presence tracking per switch
bool presenceActive[2] = {false, false};
unsigned long lastPresenceTime[2] = {0, 0};

// Helper functions
bool isPresenceMode(uint8_t mode) {
  return (mode == MODE_PRESENCE_MANUAL || mode == MODE_AI_PRESENCE_MANUAL);
}

bool isAIMode(uint8_t mode) {
  return (mode == MODE_AI_MANUAL || mode == MODE_AI_PRESENCE_MANUAL);
}

String getModeName(uint8_t mode) {
  if (mode < modeCount) {
    return String(modeNames[mode]);
  }
  return "Unknown";
}

uint8_t getModeFromName(const String& modeName) {
  for (uint8_t i = 0; i < modeCount; i++) {
    if (modeName.equalsIgnoreCase(String(modeNames[i]))) {
      return i;
    }
  }
  return MODE_MANUAL_ONLY;
}

String getRelayTopic(uint8_t relay, const char* suffix) {
  return "smartroom/" + deviceID + "/switch" + String(relay + 1) + suffix;
}

void publishState(uint8_t relay) {
  if (!mqttClient.connected()) return;

  String topic = getRelayTopic(relay, "/state");
  mqttClient.publish(topic.c_str(), relayState[relay] ? "ON" : "OFF", true);
}

void publishMode(uint8_t relay) {
  if (!mqttClient.connected()) return;

  String topic = getRelayTopic(relay, "/mode/state");
  mqttClient.publish(topic.c_str(), String(switchMode[relay]).c_str(), true);
}

void setupRelays() {
  pinMode(RELAY_1_PIN, OUTPUT);
  pinMode(RELAY_2_PIN, OUTPUT);

  digitalWrite(RELAY_1_PIN, HIGH);
  digitalWrite(RELAY_2_PIN, HIGH);

  relayState[0] = relayState[1] = false;

  logSystemEvent("RELAY", "Both relays initialized OFF");
}

void setRelay(uint8_t relay, bool state, const String& source) {
  if (relay >= 2) return;
  if (relayState[relay] == state) return;

  relayState[relay] = state;

  uint8_t pin = (relay == 0) ? RELAY_1_PIN : RELAY_2_PIN;
  digitalWrite(pin, state ? LOW : HIGH);

  publishState(relay);
  logSwitchState(relay, source, state);
  
  // Log if this was an MQTT command
  if (source == "MQTT") {
    logSwitchEvent(relay, "MQTT", String("Remote ") + (state ? "ON" : "OFF") + " command");
  }
}

void toggleRelay(uint8_t relay) {
  if (relay >= 2) return;

  manualLock[relay] = true;   // Human decision dominates
  lastManualTime[relay] = millis();  // Track when lock was set
  setRelay(relay, !relayState[relay], "TOUCH");
  logSwitchEvent(relay, "TOUCH", "Manual toggle");
}

void setSwitchMode(uint8_t relay, uint8_t mode, const String& source) {
  if (relay >= 2 || mode >= modeCount) return;

  uint8_t oldMode = switchMode[relay];
  if (oldMode == mode) return;

  switchMode[relay] = mode;
  modeChanged[relay] = true;
  lastModeChange[relay] = millis();

  manualLock[relay] = false;  // Clear lock when mode changes

  publishMode(relay);

  logSwitchEvent(relay, "MODE",
    "Changed from " + getModeName(oldMode) +
    " to " + getModeName(mode) +
    " via " + source);

  presenceActive[relay] = false;
  lastPresenceTime[relay] = 0;

  if (isPresenceMode(mode) && isHumanPresent()) {
    setRelay(relay, true, "MODE_CHANGE");
  }
}

void runModeLogic() {
  static unsigned long lastCheck = 0;

  if (millis() - lastCheck < 100) return;
  lastCheck = millis();

  bool globalPresence = isHumanPresent();
  unsigned long now = millis();

  for (int i = 0; i < 2; i++) {
    
    // Check if manual lock should expire
    if (manualLock[i] && (now - lastManualTime[i] > MANUAL_OVERRIDE_TIMEOUT_MS)) {
      manualLock[i] = false;
      logSwitchEvent(i, "MANUAL", "Lock auto-expired");
    }

    switch (switchMode[i]) {

      case MODE_PRESENCE_MANUAL:
        if (globalPresence) {
          if (!presenceActive[i]) {
            manualLock[i] = false;   // Reset lock on new presence session
            presenceActive[i] = true;
            logSwitchEvent(i, "PRESENCE", "Human detected");
          }

          lastPresenceTime[i] = now;

          if (!relayState[i] && !manualLock[i]) {
            setRelay(i, true, "PRESENCE");
          }

        } else {
          if (presenceActive[i] &&
              (now - lastPresenceTime[i] > PRESENCE_OFF_DELAY_MS)) {

            presenceActive[i] = false;

            logSwitchEvent(i, "PRESENCE",
              "No human for " + String(PRESENCE_OFF_DELAY_MS / 1000) + "s");

            if (relayState[i] && !manualLock[i]) {
              setRelay(i, false, "PRESENCE");
            }
          }
        }
        break;

      case MODE_AI_MANUAL:
        if (globalPresence != presenceActive[i]) {
          presenceActive[i] = globalPresence;

          if (globalPresence) {
            logSwitchEvent(i, "AI", "Human detected (AI input)");
          }
        }
        
        break;

      case MODE_AI_PRESENCE_MANUAL:
        if (globalPresence) {
          if (!presenceActive[i]) {
            presenceActive[i] = true;
            logSwitchEvent(i, "PRESENCE",
              "Human detected (AI+Presence)");
          }

          lastPresenceTime[i] = now;

          // Optional: Auto-on based on presence, but AI can override
          if (!relayState[i] && !manualLock[i]) {
            setRelay(i, true, "PRESENCE");
          }

        } else {
          if (presenceActive[i] &&
              (now - lastPresenceTime[i] > PRESENCE_OFF_DELAY_MS)) {

            presenceActive[i] = false;

            logSwitchEvent(i, "PRESENCE",
              "No human for " + String(PRESENCE_OFF_DELAY_MS / 1000) +
              "s (AI+Presence)");
              
            if (relayState[i] && !manualLock[i]) {
              setRelay(i, false, "PRESENCE");
            }
          }
        }
        break;

      default:
        // Manual mode - just track presence for logging
        if (globalPresence != presenceActive[i]) {
          presenceActive[i] = globalPresence;
          if (globalPresence) {
            logSwitchEvent(i, "PRESENCE", "Human detected (monitoring)");
          }
        }
        break;
    }
  }
}
