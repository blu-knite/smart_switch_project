#include "touch_manager.h"
#include "config.h"
#include "device_control.h"
#include "logger.h"

bool lastTouch[2] = {false, false};
unsigned long lastToggleTime[2] = {0, 0};

void setupTouch() {
  pinMode(TOUCH_1_PIN, INPUT_PULLUP);
  pinMode(TOUCH_2_PIN, INPUT_PULLUP);
  LOG_I("TOUCH", "Touch sensors ready (instant response)");
}

void updateTouch() {
  bool t1 = (digitalRead(TOUCH_1_PIN) == LOW);
  bool t2 = (digitalRead(TOUCH_2_PIN) == LOW);
  unsigned long now = millis();

  // Switch 1: Rising edge detection (touch start)
  if (t1 && !lastTouch[0]) {
    // Simple debounce: ignore if last toggle was too recent (50ms)
    if (now - lastToggleTime[0] > 50) {
      toggleRelay(0);
      lastToggleTime[0] = now;
      LOG_D("TOUCH", "Switch1 toggled");
    }
  }

  // Switch 2
  if (t2 && !lastTouch[1]) {
    if (now - lastToggleTime[1] > 50) {
      toggleRelay(1);
      lastToggleTime[1] = now;
      LOG_D("TOUCH", "Switch2 toggled");
    }
  }

  lastTouch[0] = t1;
  lastTouch[1] = t2;
}