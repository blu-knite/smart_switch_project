#include "network_utils.h"
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

String getPublicIP() {
  // Check WiFi connection first
  if (WiFi.status() != WL_CONNECTED) {
    return "WiFi not connected";
  }
  
  WiFiClient client;
  HTTPClient http;
  
  // Set timeout to avoid hanging
  http.setTimeout(5000);
  http.begin(client, "http://api.ipify.org");
  
  int code = http.GET();
  String ip;
  
  if (code > 0) {
    ip = http.getString();
    ip.trim();
    if (ip.length() > 0) {
      http.end();
      return ip;
    }
  }
  
  http.end();
  return "Failed to get IP (error: " + String(code) + ")";
}
