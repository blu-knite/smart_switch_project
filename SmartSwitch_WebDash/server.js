// Add this at the VERY TOP of server.js, before any other requires
process.env.NODE_CONFIG_DIR = require('path').join(__dirname, 'src/config');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const https = require('https');
const fs = require('fs');
const socketIO = require('socket.io');
const path = require('path');
const config = require('config');
const jwt = require('jsonwebtoken');

// Database connection
const sequelize = require('./src/config/database');

// Import models
require('./src/models');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const placeRoutes = require('./src/routes/placeRoutes');
const boardRoutes = require('./src/routes/boardRoutes');
const switchRoutes = require('./src/routes/switchRoutes');
const scheduleRoutes = require('./src/routes/scheduleRoutes');
const routineRoutes = require('./src/routes/routineRoutes');
const aiProxyRoutes = require('./src/routes/aiProxyRoutes');

// Import services
const mqttService = require('./src/services/mqttService');

// Initialize Express app
const app = express();

// Security headers middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.get('rateLimit.windowMs'),
  max: config.get('rateLimit.max'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files from public folder
app.use(express.static(path.join(__dirname, 'public')));
app.use('/dist', express.static(path.join(__dirname, 'dist')));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware (for development)
if (config.get('env') === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/places', placeRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/switches', switchRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/ai', aiProxyRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: config.get('env'),
    mqtt: mqttService.connected ? 'connected' : 'disconnected',
    database: 'connected',
    uptime: process.uptime()
  });
});

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'SmartSwitch API',
    version: '2.0.0',
    environment: config.get('env'),
    features: {
      mqtt: mqttService.connected,
      websocket: true,
      ai: true
    }
  });
});

// Root endpoint - serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create HTTP/HTTPS server
let server;
const PORT = config.get('server.port');

// Check for SSL certificates in production
if (config.get('env') === 'production' && fs.existsSync('./ssl/key.pem') && fs.existsSync('./ssl/cert.pem')) {
  const httpsOptions = {
    key: fs.readFileSync('./ssl/key.pem'),
    cert: fs.readFileSync('./ssl/cert.pem')
  };
  server = https.createServer(httpsOptions, app);
  console.log('🔒 HTTPS server created');
} else {
  server = http.createServer(app);
  console.log('🔓 HTTP server created (development mode)');
}

// Initialize Socket.IO
const io = socketIO(server, {
  cors: {
    origin: config.get('corsOrigins'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Make io accessible to routes
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, config.get('jwt.secret'));
      socket.userId = decoded.id;
      socket.join(`user_${decoded.id}`);
      console.log(`✓ User ${decoded.id} authenticated on socket ${socket.id}`);
      
      // Send current MQTT status
      socket.emit('mqtt:status', { connected: mqttService.connected });
      
      // Send confirmation back to client
      socket.emit('authenticated', { 
        success: true, 
        userId: decoded.id,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('✗ Socket authentication failed:', error.message);
      socket.emit('authenticated', { success: false, error: error.message });
    }
  });

  socket.on('subscribe', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} subscribed to ${room}`);
  });

  socket.on('unsubscribe', (room) => {
    socket.leave(room);
    console.log(`Socket ${socket.id} unsubscribed from ${room}`);
  });

  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback({ pong: Date.now() });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Initialize MQTT service with io
mqttService.init(io);

// SPA fallback - for client-side routing
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // Skip static file requests (they're already handled by express.static)
  if (req.path.includes('.')) {
    return next();
  }
  // Serve index.html for all other routes (for client-side routing)
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found',
    path: req.url
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    message,
    error: config.get('env') === 'development' ? {
      stack: err.stack,
      details: err
    } : {}
  });
});

// Database connection and server start
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected successfully');
    
    // Sync all models with database (alter in development, not in production)
    const syncOptions = config.get('env') === 'development' 
      ? { alter: { drop: false } } 
      : {};
    
    await sequelize.sync(syncOptions);
    console.log('✓ Database synced successfully');
    
    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      console.log('\n' + '='.repeat(50));
      console.log(`🚀 SMART SWITCH SERVER v2.0`);
      console.log('='.repeat(50));
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${config.get('env')}`);
      console.log(`✓ Protocol: ${server instanceof https.Server ? 'HTTPS' : 'HTTP'}`);
      console.log(`✓ CORS allowed origins: ${config.get('corsOrigins').join(', ')}`);
      console.log(`✓ Serving frontend from: ${path.join(__dirname, 'public')}`);
      console.log(`✓ Config loaded from: ${process.env.NODE_CONFIG_DIR}`);
      console.log(`✓ MQTT: ${mqttService.connected ? 'connected' : 'disconnected'}`);
      
      if (config.get('env') === 'development') {
        console.log('\n📚 Available endpoints:');
        console.log('   GET  /                  - Frontend app');
        console.log('   GET  /api/health        - Health check');
        console.log('   GET  /api/info          - API info');
        console.log('   POST /api/auth/login    - Login');
        console.log('   POST /api/auth/register - Register');
        console.log('   GET  /api/auth/me       - Current user');
        console.log('   GET  /api/boards        - List boards');
        console.log('   GET  /api/switches      - List switches');
        console.log('   GET  /api/places        - List places');
        console.log('   GET  /api/schedules     - List schedules');
        console.log('   GET  /api/routines      - List routines');
        console.log('   GET  /api/ai/insights   - AI insights');
        console.log('\n🌐 WebSocket server ready');
      }
      
      const protocol = server instanceof https.Server ? 'https' : 'http';
      console.log(`\n🚀 Application is Live at ${protocol}://${config.get('server.host') || 'localhost'}:${PORT}`);
      console.log('='.repeat(50) + '\n');
    });
  } catch (err) {
    console.error('✗ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  gracefulShutdown();
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  gracefulShutdown();
});

function gracefulShutdown() {
  server.close(() => {
    console.log('✓ HTTP server closed');
    sequelize.close();
    mqttService.disconnect();
    console.log('✓ Database and MQTT connections closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, just log
});

module.exports = { app, server, io };