#include "mqtt_manager.h"
#include "config.h"
#include "device_control.h"
#include "logger.h"
#include "network_utils.h"

#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <PubSubClient.h>

extern String deviceID;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Topic caching
String topicSwitch[2];
String topicModeSet[2];
String topicModeGet[2];  // For mode queries
String topicStatus;
String topicLogs;
String topicCommand;      // For device commands

unsigned long lastMsgTime = 0;
String lastProcessedTopic = "";
String lastProcessedPayload = "";

static void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }

  String receivedTopic = String(topic);

  // Ignore state updates to avoid loops
  if (receivedTopic.endsWith("/state") || receivedTopic.endsWith("/logs")) {
    return;
  }

  // Debounce duplicate messages
  String msgKey = receivedTopic + ":" + msg;
  if (msgKey == lastProcessedTopic + ":" + lastProcessedPayload &&
      millis() - lastMsgTime < 500) {
    return;
  }

  lastMsgTime = millis();
  lastProcessedTopic = receivedTopic;
  lastProcessedPayload = msg;

  logMessage(LOG_INFO, "MQTT_RX", receivedTopic + " → " + msg);

  // Handle device-wide commands
  if (receivedTopic == topicCommand) {
    if (msg == "RESTART") {
      logSystemEvent("COMMAND", "Restarting...");
      delay(1000);
      ESP.restart();
    }
    else if (msg == "STATUS") {
      // Publish all states
      for (int i = 0; i < 2; i++) {
        publishState(i);
        publishMode(i);
      }
      mqttClient.publish(topicStatus.c_str(), "ONLINE", true);
    }
    return;
  }

  // Handle mode changes
  for (int i = 0; i < 2; i++) {
    if (receivedTopic == topicModeSet[i]) {
      // Handle numeric mode
      if (msg.length() == 1 && msg.charAt(0) >= '0' && msg.charAt(0) <= '3') {
        setSwitchMode(i, msg.toInt(), "MQTT");
      }
      // Handle mode name from web panel
      else {
        uint8_t mode = getModeFromName(msg);
        setSwitchMode(i, mode, "WEB");
      }
      return;
    }
    
    // Handle mode queries
    if (receivedTopic == topicModeGet[i]) {
      publishMode(i);
      return;
    }
  }

  // Handle relay commands
  for (int i = 0; i < 2; i++) {
    if (receivedTopic == topicSwitch[i]) {
      if (msg == "ON") setRelay(i, true, "MQTT");
      else if (msg == "OFF") setRelay(i, false, "MQTT");
      else if (msg == "TOGGLE") toggleRelay(i);
      return;
    }
  }
}

void setupMQTT() {
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(60);
  mqttClient.setSocketTimeout(10);
  
  // Initialize cached topics
  String baseTopic = "smartroom/" + deviceID + "/";
  
  for (int i = 0; i < 2; i++) {
    topicSwitch[i] = baseTopic + "switch" + String(i + 1) + "/set";
    topicModeSet[i] = baseTopic + "switch" + String(i + 1) + "/mode/set";
    topicModeGet[i] = baseTopic + "switch" + String(i + 1) + "/mode/get";
  }
  
  topicStatus = baseTopic + "status";
  topicLogs = baseTopic + "logs";
  topicCommand = baseTopic + "command";
  
  logSystemEvent("MQTT", "Topics configured for web panel");
}

void maintainMQTT() {
  static bool ipLogged = false;
  static unsigned long lastReconnectAttempt = 0;
  static int reconnectAttempts = 0;

  if (!mqttClient.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = now;
      reconnectAttempts++;

      logMessage(LOG_INFO, "MQTT", "Connecting to " + String(MQTT_BROKER) + "...");

      // Last Will Testament
      if (mqttClient.connect(
            deviceID.c_str(),
            MQTT_USER_ID,
            MQTT_USER_PW,
            topicStatus.c_str(),
            0,
            true,
            "OFFLINE")) {

        mqttClient.publish(topicStatus.c_str(), "ONLINE", true);
        
        // Subscribe to all command topics
        for (int i = 0; i < 2; i++) {
          mqttClient.subscribe(topicSwitch[i].c_str());
          mqttClient.subscribe(topicModeSet[i].c_str());
          mqttClient.subscribe(topicModeGet[i].c_str());
        }
        mqttClient.subscribe(topicCommand.c_str());

        logMessage(LOG_INFO, "MQTT", "Connected to broker");
        reconnectAttempts = 0;

        // Publish initial states for web panel
        for (int i = 0; i < 2; i++) {
          publishState(i);
          publishMode(i);
        }

        // Get public IP once
        if (!ipLogged && WiFi.status() == WL_CONNECTED) {
          String publicIP = getPublicIP();
          logSystemEvent("PUBLIC IP", publicIP);
          ipLogged = true;
        }

      } else {
        if (reconnectAttempts > 10) {
          logMessage(LOG_ERROR, "MQTT", "Too many failures, rebooting...");
          delay(2000);
          ESP.restart();
        }
        logMessage(LOG_WARNING, "MQTT", "Connection failed, rc=" + String(mqttClient.state()));
      }
    }
    return;
  }

  mqttClient.loop();
}
