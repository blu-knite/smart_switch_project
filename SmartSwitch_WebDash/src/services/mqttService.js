const mqtt = require('mqtt');
const config = require('config');
const { MQTT_TOPICS, MODES } = require('../utils/constants');
const { Board, Switch, User } = require('../models');
const { Op } = require('sequelize');

class MQTTService {
  constructor() {
    this.client = null;
    this.io = null;
    this.connected = false;
    this.messageCount = 0;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  init(io) {
    this.io = io;
    this.connect();
  }

  connect() {
    const mqttConfig = config.get('mqtt');
    
    console.log(`Connecting to MQTT broker at ${mqttConfig.broker}:${mqttConfig.port}`);
    
    this.client = mqtt.connect(`mqtt://${mqttConfig.broker}:${mqttConfig.port}`, {
      username: mqttConfig.username,
      password: mqttConfig.password,
      keepalive: mqttConfig.keepalive,
      reconnectPeriod: 5000,
      connectTimeout: 30000
    });

    this.client.on('connect', () => {
      console.log('✓ Connected to MQTT broker');
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // Subscribe to topics
      const mqttConfig = config.get('mqtt');
      mqttConfig.topics.forEach(topic => {
        this.client.subscribe(topic, { qos: 1 }, (err) => {
          if (!err) {
            console.log(`  Subscribed to ${topic}`);
          } else {
            console.error(`  Failed to subscribe to ${topic}:`, err);
          }
        });
      });

      // Broadcast connection status
      if (this.io) {
        this.io.emit('mqtt:status', { connected: true });
      }
    });

    this.client.on('message', this.handleMessage.bind(this));
    
    this.client.on('error', (error) => {
      console.error('MQTT error:', error);
    });

    this.client.on('close', () => {
      console.log('MQTT connection closed');
      this.connected = false;
      
      if (this.io) {
        this.io.emit('mqtt:status', { connected: false });
      }
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      console.log(`MQTT reconnecting... Attempt ${this.reconnectAttempts}`);
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached. Stopping reconnection.');
        this.client.end();
      }
    });
  }

  async handleMessage(topic, message) {
    const payload = message.toString();
    this.messageCount++;
    
    console.log(`[MQTT #${this.messageCount}] ${topic} -> ${payload}`);

    try {
      // Parse topic: smartroom/{boardUid}/...
      const parts = topic.split('/');
      if (parts.length < 2 || parts[0] !== 'smartroom') {
        return;
      }

      const boardUid = parts[1];
      
      // Find or create board
      let board = await Board.findOne({ 
        where: { uid: boardUid },
        include: [{ model: User, as: 'user' }]
      });
      
      if (!board) {
        // Auto-register new board with default admin user
        const adminUser = await User.findOne({ where: { role: 'admin' } });
        if (!adminUser) {
          console.error('No admin user found for auto-registration');
          return;
        }

        board = await Board.create({
          uid: boardUid,
          name: `Board ${boardUid}`,
          userId: adminUser.id,
          lastSeen: new Date(),
          isOnline: true
        });
        console.log(`✨ New board auto-registered: ${boardUid} for user ${adminUser.email}`);
      } else {
        // Update last seen
        board.lastSeen = new Date();
        board.isOnline = true;
        await board.save();
      }

      // Handle different topic patterns
      if (parts.length >= 3) {
        // Switch state: smartroom/{boardUid}/switch{index}/state
        if (parts[2].startsWith('switch') && parts[3] === 'state') {
          const switchIndex = parseInt(parts[2].replace('switch', ''));
          await this.handleSwitchState(board.id, switchIndex, payload, board.userId);
        }
        
        // Switch mode: smartroom/{boardUid}/switch{index}/mode/state
        else if (parts[2].startsWith('switch') && parts[3] === 'mode' && parts[4] === 'state') {
          const switchIndex = parseInt(parts[2].replace('switch', ''));
          const mode = parseInt(payload);
          await this.handleSwitchMode(board.id, switchIndex, mode, board.userId);
        }
        
        // Switch power: smartroom/{boardUid}/switch{index}/power
        else if (parts[2].startsWith('switch') && parts[3] === 'power') {
          const switchIndex = parseInt(parts[2].replace('switch', ''));
          const power = parseInt(payload);
          await this.handleSwitchPower(board.id, switchIndex, power, board.userId);
        }
        
        // Status: smartroom/{boardUid}/status
        else if (parts[2] === 'status') {
          await this.handleBoardStatus(board.id, payload, board.userId);
        }
      }

    } catch (error) {
      console.error('Error handling MQTT message:', error);
    }
  }

  async handleSwitchState(boardId, switchIndex, state, userId) {
    // Find or create switch
    let switchObj = await Switch.findOne({
      where: { boardId, index: switchIndex }
    });

    const isOn = state === 'ON' || state === '1' || state === 'true';

    if (!switchObj) {
      // Create new switch with default values
      switchObj = await Switch.create({
        boardId,
        index: switchIndex,
        name: `Switch ${switchIndex}`,
        state: isOn,
        lastActive: new Date()
      });
      console.log(`✨ New switch created: Board ${boardId}, Switch ${switchIndex}`);
    } else {
      // Update existing switch
      switchObj.state = isOn;
      switchObj.lastActive = new Date();
      await switchObj.save();
    }

    // Broadcast to web clients
    if (this.io && userId) {
      this.io.to(`user_${userId}`).emit('switch:updated', {
        boardId,
        switch: switchObj.toJSON()
      });
    }
  }

  async handleSwitchMode(boardId, switchIndex, mode, userId) {
    const switchObj = await Switch.findOne({
      where: { boardId, index: switchIndex }
    });

    if (switchObj) {
      switchObj.mode = mode;
      await switchObj.save();

      // Broadcast to web clients
      if (this.io && userId) {
        this.io.to(`user_${userId}`).emit('switch:mode', {
          boardId,
          switchIndex,
          mode,
          modeName: switchObj.getModeName()
        });
      }
    }
  }

  async handleSwitchPower(boardId, switchIndex, power, userId) {
    const switchObj = await Switch.findOne({
      where: { boardId, index: switchIndex }
    });

    if (switchObj) {
      switchObj.power = power;
      await switchObj.save();

      // Broadcast to web clients
      if (this.io && userId) {
        this.io.to(`user_${userId}`).emit('switch:power', {
          boardId,
          switchIndex,
          power
        });
      }
    }
  }

  async handleBoardStatus(boardId, status, userId) {
    const board = await Board.findByPk(boardId);
    if (board) {
      const isOnline = status === 'online' || status === '1' || status === 'true';
      board.isOnline = isOnline;
      board.lastSeen = new Date();
      await board.save();

      // Broadcast to web clients
      if (this.io && userId) {
        this.io.to(`user_${userId}`).emit('board:status', {
          boardId,
          status: board.isOnline ? 'online' : 'offline'
        });
      }
    }
  }

  // Publish methods for web clients to control switches
  publishSwitchState(boardUid, switchIndex, state) {
    if (!this.connected) {
      console.error('MQTT not connected');
      return false;
    }

    const stateStr = state === true || state === 'ON' ? 'ON' : 'OFF';
    const topic = `smartroom/${boardUid}/switch${switchIndex}/set`;
    
    this.client.publish(topic, stateStr, { qos: 1, retain: true });
    console.log(`📤 Published to ${topic}: ${stateStr}`);
    return true;
  }

  publishSwitchMode(boardUid, switchIndex, mode) {
    if (!this.connected) {
      console.error('MQTT not connected');
      return false;
    }

    const topic = `smartroom/${boardUid}/switch${switchIndex}/mode/set`;
    const modeStr = mode.toString();
    
    this.client.publish(topic, modeStr, { qos: 1, retain: true });
    console.log(`📤 Published to ${topic}: ${modeStr}`);
    return true;
  }

  publishCommand(boardUid, command) {
    if (!this.connected) {
      console.error('MQTT not connected');
      return false;
    }

    const topic = `smartroom/${boardUid}/command`;
    
    this.client.publish(topic, command, { qos: 1 });
    console.log(`📤 Published to ${topic}: ${command}`);
    return true;
  }

  getBoardStatus(boardUid) {
    if (!this.connected) return null;
    
    const topic = `smartroom/${boardUid}/status/get`;
    this.client.publish(topic, '?', { qos: 1 });
    return true;
  }

  disconnect() {
    if (this.client) {
      this.client.end(true, {}, () => {
        console.log('MQTT client disconnected');
      });
    }
  }
}

module.exports = new MQTTService();