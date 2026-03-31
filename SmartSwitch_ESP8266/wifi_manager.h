#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <ESP8266WiFi.h>
#include <WiFiManager.h>

extern WiFiManager wm;

void setupWiFi();
void handleWiFi();

#endif
