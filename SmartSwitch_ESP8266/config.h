#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

#define LED_PIN     LED_BUILTIN

/* -------- MQTT -------- */
#define MQTT_BROKER "57.129.115.104"
#define MQTT_PORT 1883

#define MQTT_USER_ID "ESPLogger"
#define MQTT_USER_PW "Admin?12345"

/* -------- RELAYS (Active LOW) -------- */
#define RELAY_1_PIN D1   // GPIO5
#define RELAY_2_PIN D2   // GPIO4

/* -------- TOUCH -------- */
#define TOUCH_1_PIN D5   // GPIO14
#define TOUCH_2_PIN D6   // GPIO12

/* -------- HLK-LD2420 -------- */
#define PRESENCE_PIN D7

/* -------- TIMING CONFIGURATION -------- */

// Presence filtering
#define PRESENCE_ON_DELAY_MS        15000   // 15 sec continuous detect
#define PRESENCE_OFF_DELAY_MS       15000   // 15 sec continuous absence

// Manual override timeout
#define MANUAL_OVERRIDE_TIMEOUT_MS  1800000  // 30 minutes

// Input filtering
#define PRESENCE_INPUT_DEBOUNCE_MS  300
#define TOUCH_DEBOUNCE_MS           50

/* -------- MODES -------- */
#define MODE_MANUAL_ONLY               0
#define MODE_PRESENCE_MANUAL           1
#define MODE_AI_MANUAL                 2
#define MODE_AI_PRESENCE_MANUAL        3

#endif
