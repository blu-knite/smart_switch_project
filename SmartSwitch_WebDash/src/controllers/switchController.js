const { Switch, Board, Schedule } = require('../models');
const mqttService = require('../services/mqttService');
const { MODES } = require('../utils/constants');
const { Op } = require('sequelize');

exports.getAllSwitches = async (req, res) => {
  try {
    const switches = await Switch.findAll({
      include: [
        {
          model: Board,
          as: 'board',
          where: { userId: req.user.id },
          attributes: ['id', 'uid', 'name', 'icon', 'isOnline']
        }
      ],
      order: [['boardId', 'ASC'], ['index', 'ASC']]
    });

    res.json(switches);
  } catch (error) {
    console.error('Get switches error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getSwitchById = async (req, res) => {
  try {
    const switchObj = await Switch.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Board,
          as: 'board',
          where: { userId: req.user.id }
        },
        {
          model: Schedule,
          as: 'schedules',
          where: { isActive: true },
          required: false
        }
      ]
    });

    if (!switchObj) {
      return res.status(404).json({ message: 'Switch not found' });
    }

    res.json(switchObj);
  } catch (error) {
    console.error('Get switch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateSwitch = async (req, res) => {
  try {
    const switchObj = await Switch.findOne({
      where: { id: req.params.id },
      include: [{ model: Board, as: 'board' }]
    });

    if (!switchObj) {
      return res.status(404).json({ message: 'Switch not found' });
    }

    // Check if user owns the board
    const board = await Board.findOne({
      where: { 
        id: switchObj.boardId,
        userId: req.user.id 
      }
    });

    if (!board) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Update switch
    await switchObj.update(req.body);

    // Fetch updated switch
    const updatedSwitch = await Switch.findByPk(switchObj.id, {
      include: [{ model: Board, as: 'board' }]
    });

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('switch:updated', updatedSwitch);

    res.json(updatedSwitch);
  } catch (error) {
    console.error('Update switch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.toggleSwitch = async (req, res) => {
  try {
    const switchObj = await Switch.findOne({
      where: { id: req.params.id },
      include: [{ model: Board, as: 'board' }]
    });

    if (!switchObj) {
      return res.status(404).json({ message: 'Switch not found' });
    }

    // Check if user owns the board
    const board = await Board.findOne({
      where: { 
        id: switchObj.boardId,
        userId: req.user.id 
      }
    });

    if (!board) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Check if board is online
    if (!board.isOnline) {
      return res.status(400).json({ message: 'Board is offline' });
    }

    // Toggle state
    const newState = !switchObj.state;
    
    // Update in database
    await switchObj.update({ 
      state: newState,
      lastActive: new Date()
    });

    // Send MQTT command to physical switch
    const mqttSuccess = mqttService.publishSwitchState(board.uid, switchObj.index, newState ? 'ON' : 'OFF');

    if (!mqttSuccess) {
      console.warn('MQTT not connected, but database updated');
    }

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('switch:toggled', {
      id: switchObj.id,
      boardId: board.id,
      switchIndex: switchObj.index,
      state: newState,
      timestamp: new Date()
    });

    res.json({ 
      id: switchObj.id,
      state: newState,
      mqttStatus: mqttSuccess ? 'sent' : 'failed',
      message: `Switch turned ${newState ? 'on' : 'off'}`
    });
  } catch (error) {
    console.error('Toggle switch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.setSwitchMode = async (req, res) => {
  try {
    const { mode } = req.body;
    
    // Validate mode
    if (![0, 1, 2, 3].includes(mode)) {
      return res.status(400).json({ message: 'Invalid mode. Must be 0-3' });
    }

    const switchObj = await Switch.findOne({
      where: { id: req.params.id },
      include: [{ model: Board, as: 'board' }]
    });

    if (!switchObj) {
      return res.status(404).json({ message: 'Switch not found' });
    }

    // Check if user owns the board
    const board = await Board.findOne({
      where: { 
        id: switchObj.boardId,
        userId: req.user.id 
      }
    });

    if (!board) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Update mode in database
    await switchObj.update({ mode });

    // Send MQTT command to physical switch
    const mqttSuccess = mqttService.publishSwitchMode(board.uid, switchObj.index, mode);

    // Emit real-time update
    const io = req.app.get('io');
    const modes = require('../utils/constants').MODES;
    io.to(`user_${req.user.id}`).emit('switch:mode', {
      id: switchObj.id,
      boardId: board.id,
      switchIndex: switchObj.index,
      mode,
      modeName: modes[mode].name,
      timestamp: new Date()
    });

    res.json({ 
      id: switchObj.id,
      mode,
      modeName: modes[mode].name,
      mqttStatus: mqttSuccess ? 'sent' : 'failed',
      message: `Switch mode set to ${modes[mode].name}`
    });
  } catch (error) {
    console.error('Set switch mode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.bulkUpdateSwitches = async (req, res) => {
  try {
    const { switchIds, action, mode } = req.body;

    if (!Array.isArray(switchIds) || switchIds.length === 0) {
      return res.status(400).json({ message: 'Invalid switch IDs' });
    }

    // Get all switches with their boards
    const switches = await Switch.findAll({
      where: { id: switchIds },
      include: [{ model: Board, as: 'board' }]
    });

    // Filter to only switches user owns
    const userSwitches = [];
    const results = [];

    for (const sw of switches) {
      const board = await Board.findOne({
        where: { 
          id: sw.boardId,
          userId: req.user.id 
        }
      });
      
      if (board) {
        userSwitches.push(sw);
      }
    }

    if (userSwitches.length === 0) {
      return res.status(403).json({ message: 'No authorized switches found' });
    }

    // Perform action
    if (action === 'turn_on' || action === 'turn_off') {
      const newState = action === 'turn_on';
      
      for (const sw of userSwitches) {
        await sw.update({ state: newState, lastActive: new Date() });
        const mqttSuccess = mqttService.publishSwitchState(sw.board.uid, sw.index, newState ? 'ON' : 'OFF');
        
        results.push({
          id: sw.id,
          state: newState,
          mqttSuccess
        });
      }
    } 
    else if (action === 'set_mode' && mode !== undefined) {
      if (![0, 1, 2, 3].includes(mode)) {
        return res.status(400).json({ message: 'Invalid mode' });
      }
      
      for (const sw of userSwitches) {
        await sw.update({ mode });
        const mqttSuccess = mqttService.publishSwitchMode(sw.board.uid, sw.index, mode);
        
        results.push({
          id: sw.id,
          mode,
          mqttSuccess
        });
      }
    } 
    else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    // Emit updates
    const io = req.app.get('io');
    userSwitches.forEach(sw => {
      io.to(`user_${req.user.id}`).emit('switch:updated', sw);
    });

    res.json({ 
      message: `Bulk ${action} completed`,
      updatedCount: userSwitches.length,
      results
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getSwitchStats = async (req, res) => {
  try {
    const switchObj = await Switch.findOne({
      where: { id: req.params.id },
      include: [{ model: Board, as: 'board' }]
    });

    if (!switchObj) {
      return res.status(404).json({ message: 'Switch not found' });
    }

    // Calculate usage stats
    const totalOnTime = await calculateTotalOnTime(switchObj.id);
    const todaySwitches = await countTodaySwitches(switchObj.id);

    res.json({
      id: switchObj.id,
      name: switchObj.name,
      state: switchObj.state,
      mode: switchObj.mode,
      modeName: switchObj.getModeName(),
      power: switchObj.power,
      totalOnTime,
      todaySwitches,
      lastActive: switchObj.lastActive,
      boardOnline: switchObj.board?.isOnline || false
    });
  } catch (error) {
    console.error('Get switch stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

async function calculateTotalOnTime(switchId) {
  // This would be implemented with a proper logging system
  // For now, return mock data
  return Math.floor(Math.random() * 24 * 60 * 60); // random seconds
}

async function countTodaySwitches(switchId) {
  // This would be implemented with a proper logging system
  // For now, return mock data
  return Math.floor(Math.random() * 10);
}