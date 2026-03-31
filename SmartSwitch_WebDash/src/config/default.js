module.exports = {
  // Server configuration
  server: {
    port: 10009,
    host: 'localhost'
  },
  
  // Environment
  env: 'development',
  
  // Database configuration
  database: {
    host: '94.249.150.42',
    port: 3306,
    name: 's85_database',
    user: 'u85_2cOVjVzIW4',
    password: '+EPd99tyyOzia8givMdf=Ukr',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  
  // JWT configuration
  jwt: {
    secret: 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: '7d'
  },
  
  // MQTT configuration (for ESP8266 communication)
  mqtt: {
    broker: '57.129.115.104',
    port: 1883,
    username: 'WebBackEnd',
    password: 'Admin?12345',
    keepalive: 60,
    topics: [
      'smartroom/#',
      'smartswitch/+/+/state',
      'smartswitch/+/status'
    ]
  },
  
  // AI Backend configuration
  aiBackend: {
    url: 'http://57.129.115.104:10006',
    timeout: 5000,
    retries: 3
  },
  
  // Mode definitions (matching ESP8266)
  modes: {
    0: { name: 'MANUAL_ONLY', description: 'Manual control only' },
    1: { name: 'PRESENCE_MANUAL', description: 'Presence detection + manual' },
    2: { name: 'AI_MANUAL', description: 'AI control + manual override' },
    3: { name: 'AI_PRESENCE_MANUAL', description: 'Full automation' }
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  
  // CORS allowed origins
  corsOrigins: [
    'http://localhost:10009',
    'http://127.0.0.1:10009',
    'http://94.249.150.42:10009',
    'http://ecesmartswitch.linkpc.net:10009',
    'https://ecesmartswitch.linkpc.net:10009',
    'http://57.129.115.104:10006',
    'https://57.129.115.104:10006'
  ]
};