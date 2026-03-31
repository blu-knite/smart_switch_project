#ifndef PRESENCE_MANAGER_H
#define PRESENCE_MANAGER_H

#include <Arduino.h>

void setupPresence();
void updatePresence();
bool isHumanPresent();
String getPresenceState();

#endif
