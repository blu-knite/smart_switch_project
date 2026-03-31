// Navigation items
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'places', label: 'Places', icon: 'map-marker-alt' },
  { id: 'boards', label: 'Boards', icon: 'microchip' },
  { id: 'schedules', label: 'Schedules', icon: 'calendar-alt' },
  { id: 'routines', label: 'Routines', icon: 'robot' },
  { id: 'settings', label: 'Settings', icon: 'cog' }
];

// Mock boards with switches (matching ESP8266 format)
export const BOARDS = [
  {
    id: 1,
    uid: 'SmartSwitch_b29',
    name: 'Living Room Board',
    icon: 'tv',
    placeId: 1,
    firmware: '2.1.0',
    lastSeen: '2 min ago',
    switches: [
      { index: 1, name: 'Main Light', state: true, mode: 3, power: 60, icon: 'lightbulb', color: 'primary' },
      { index: 2, name: 'Dimmer Light', state: false, mode: 2, power: 40, icon: 'lightbulb', color: 'cyan' },
      { index: 3, name: 'Fan', state: true, mode: 1, power: 75, icon: 'fan', color: 'success' },
      { index: 4, name: 'TV Socket', state: false, mode: 0, power: 120, icon: 'tv', color: 'warning' }
    ]
  },
  {
    id: 2,
    uid: 'SmartSwitch_a45',
    name: 'Bedroom Board',
    icon: 'bed',
    placeId: 1,
    firmware: '2.1.0',
    lastSeen: '5 min ago',
    switches: [
      { index: 1, name: 'Ceiling Light', state: false, mode: 3, power: 60, icon: 'lightbulb', color: 'primary' },
      { index: 2, name: 'Bedside Lamp', state: true, mode: 2, power: 25, icon: 'lightbulb', color: 'accent' },
      { index: 3, name: 'AC Socket', state: false, mode: 1, power: 1500, icon: 'snowflake', color: 'cyan' }
    ]
  },
  {
    id: 3,
    uid: 'SmartSwitch_c78',
    name: 'Office Board',
    icon: 'desktop',
    placeId: 2,
    firmware: '2.1.0',
    lastSeen: '1 min ago',
    switches: [
      { index: 1, name: 'Desk Light', state: true, mode: 3, power: 40, icon: 'lightbulb', color: 'primary' },
      { index: 2, name: 'Monitor Socket', state: true, mode: 2, power: 200, icon: 'desktop', color: 'purple' },
      { index: 3, name: 'Heater', state: false, mode: 1, power: 1000, icon: 'fire', color: 'warning' },
      { index: 4, name: 'Router', state: true, mode: 0, power: 15, icon: 'wifi', color: 'success' },
      { index: 5, name: 'Printer', state: false, mode: 0, power: 50, icon: 'print', color: 'muted' }
    ]
  }
];

// Dashboard stats
export const STATS = [
  {
    label: 'Power Consumption',
    value: '2.4 kW',
    icon: 'bolt',
    color: 'primary',
    trend: 'success',
    trendValue: '+12.5%',
    progress: 60
  },
  {
    label: 'Active Switches',
    value: '8/12',
    icon: 'toggle-on',
    color: 'success',
    trend: 'success',
    trendValue: '66% Active',
    progress: 66
  },
  {
    label: 'AI Trust Score',
    value: '94%',
    icon: 'brain',
    color: 'accent',
    trend: 'success',
    trendValue: '+2%',
    progress: 94
  },
  {
    label: 'Boards Online',
    value: '3/3',
    icon: 'microchip',
    color: 'warning',
    trend: 'success',
    trendValue: 'All Online',
    progress: 100
  }
];

// Mock notifications
export const NOTIFICATIONS = [
  {
    id: 1,
    title: 'Board Connected',
    message: 'SmartSwitch_b29 (Living Room) is online',
    time: 'Just now',
    type: 'success',
    icon: 'check-circle'
  },
  {
    id: 2,
    title: 'AI Recommendation',
    message: 'Switch 3 on Office Board could be optimized',
    time: '5 min ago',
    type: 'info',
    icon: 'robot'
  },
  {
    id: 3,
    title: 'Mode Changed',
    message: 'Bedroom Board switch 2 set to AI mode',
    time: '1 hour ago',
    type: 'info',
    icon: 'cog'
  }
];

// Mode definitions matching ESP8266
export const MODES = {
  0: { name: 'MANUAL_ONLY', description: 'Manual control only', color: 'muted', icon: 'hand' },
  1: { name: 'PRESENCE_MANUAL', description: 'Presence detection + manual', color: 'warning', icon: 'user' },
  2: { name: 'AI_MANUAL', description: 'AI control + manual override', color: 'primary', icon: 'robot' },
  3: { name: 'AI_PRESENCE_MANUAL', description: 'Full automation', color: 'success', icon: 'magic' }
};

// Mock users
export const USERS = [
  {
    email: 'admin@smartswitch.io',
    name: 'Admin User',
    role: 'Administrator'
  },
  {
    email: 'demo@smartswitch.io',
    name: 'Demo User',
    role: 'User'
  }
];

// Theme colors
export const THEMES = {
  dark: {
    background: 'hsl(225, 50%, 4%)',
    foreground: 'hsl(210, 40%, 98%)',
    primary: 'hsl(187, 100%, 50%)'
  },
  light: {
    background: 'hsl(0, 0%, 100%)',
    foreground: 'hsl(222, 47%, 11%)',
    primary: 'hsl(221, 83%, 53%)'
  }
};

// API endpoints
export const API_ENDPOINTS = {
  BOARDS: '/api/boards',
  PLACES: '/api/places',
  SCHEDULES: '/api/schedules',
  ROUTINES: '/api/routines',
  NOTIFICATIONS: '/api/notifications'
};