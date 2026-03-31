// Mode definitions matching ESP8266
const MODES = {
  0: { name: 'MANUAL_ONLY', description: 'Manual control only', icon: 'hand' },
  1: { name: 'PRESENCE_MANUAL', description: 'Presence detection + manual', icon: 'user' },
  2: { name: 'AI_MANUAL', description: 'AI control + manual override', icon: 'robot' },
  3: { name: 'AI_PRESENCE_MANUAL', description: 'Full automation', icon: 'magic' }
};

// Switch states
const SWITCH_STATES = {
  ON: 'ON',
  OFF: 'OFF',
  TOGGLE: 'TOGGLE'
};

// MQTT Topics
const MQTT_TOPICS = {
  SWITCH_SET: (boardUid, index) => `smartroom/${boardUid}/switch${index}/set`,
  SWITCH_STATE: (boardUid, index) => `smartroom/${boardUid}/switch${index}/state`,
  MODE_SET: (boardUid, index) => `smartroom/${boardUid}/switch${index}/mode/set`,
  MODE_STATE: (boardUid, index) => `smartroom/${boardUid}/switch${index}/mode/state`,
  MODE_NAME: (boardUid, index) => `smartroom/${boardUid}/switch${index}/mode/name`,
  COMMAND: (boardUid) => `smartroom/${boardUid}/command`,
  STATUS: (boardUid) => `smartroom/${boardUid}/status`
};

module.exports = {
  MODES,
  SWITCH_STATES,
  MQTT_TOPICS
};