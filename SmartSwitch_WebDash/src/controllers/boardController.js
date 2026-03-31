const { Board, Place, Switch, User, Routine, Schedule } = require('../models');
const mqttService = require('../services/mqttService');
const { Op } = require('sequelize');

exports.getAllBoards = async (req, res) => {
  try {
    const boards = await Board.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Place,
          as: 'place',
          attributes: ['id', 'name', 'icon']
        },
        {
          model: Switch,
          as: 'switches',
          order: [['index', 'ASC']]
        }
      ],
      order: [['lastSeen', 'DESC']]
    });

    // Add stats to each board
    const boardsWithStats = boards.map(board => {
      const boardJson = board.toJSON();
      const switches = boardJson.switches || [];
      
      boardJson.stats = {
        totalSwitches: switches.length,
        activeSwitches: switches.filter(s => s.state).length,
        totalPower: switches.reduce((sum, s) => s.state ? sum + (s.power || 0) : sum, 0)
      };
      
      return boardJson;
    });

    res.json(boardsWithStats);
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBoardById = async (req, res) => {
  try {
    const board = await Board.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: [
        {
          model: Place,
          as: 'place'
        },
        {
          model: Switch,
          as: 'switches',
          order: [['index', 'ASC']]
        },
        {
          model: Routine,
          as: 'routines',
          where: { enabled: true },
          required: false
        },
        {
          model: Schedule,
          as: 'schedules',
          where: { isActive: true },
          required: false
        }
      ]
    });

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Request current status from MQTT
    mqttService.getBoardStatus(board.uid);

    res.json(board);
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBoardByUid = async (req, res) => {
  try {
    const board = await Board.findOne({
      where: { 
        uid: req.params.uid,
        userId: req.user.id 
      },
      include: [
        {
          model: Place,
          as: 'place'
        },
        {
          model: Switch,
          as: 'switches',
          order: [['index', 'ASC']]
        }
      ]
    });

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    res.json(board);
  } catch (error) {
    console.error('Get board by UID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createBoard = async (req, res) => {
  try {
    const { uid, name, icon, description, placeId, firmwareVersion } = req.body;

    // Check if board with same UID already exists
    const existingBoard = await Board.findOne({ where: { uid } });
    if (existingBoard) {
      return res.status(400).json({ message: 'Board with this UID already exists' });
    }

    // Verify place belongs to user if provided
    if (placeId) {
      const place = await Place.findOne({ 
        where: { 
          id: placeId, 
          userId: req.user.id 
        } 
      });
      if (!place) {
        return res.status(400).json({ message: 'Invalid place ID' });
      }
    }

    const board = await Board.create({
      uid,
      name,
      icon: icon || 'microchip',
      description,
      placeId: placeId || null,
      userId: req.user.id,
      firmwareVersion: firmwareVersion || '1.0.0',
      lastSeen: new Date(),
      isOnline: true
    });

    // Create default switches (4 switches per board by default)
    const defaultSwitches = [];
    const defaultIcons = ['lightbulb', 'fan', 'tv', 'plug'];
    const defaultColors = ['primary', 'success', 'warning', 'muted'];
    
    for (let i = 1; i <= 4; i++) {
      defaultSwitches.push({
        boardId: board.id,
        index: i,
        name: `Switch ${i}`,
        icon: defaultIcons[i-1] || 'lightbulb',
        color: defaultColors[i-1] || 'primary',
        mode: 3, // AI_PRESENCE_MANUAL
        state: false,
        power: 60
      });
    }
    
    await Switch.bulkCreate(defaultSwitches);

    // Fetch board with switches
    const newBoard = await Board.findByPk(board.id, {
      include: [{ model: Switch, as: 'switches' }]
    });

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('board:created', newBoard);

    res.status(201).json(newBoard);
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateBoard = async (req, res) => {
  try {
    const board = await Board.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Verify place belongs to user if provided
    if (req.body.placeId) {
      const place = await Place.findOne({ 
        where: { 
          id: req.body.placeId, 
          userId: req.user.id 
        } 
      });
      if (!place) {
        return res.status(400).json({ message: 'Invalid place ID' });
      }
    }

    await board.update(req.body);

    // Fetch updated board with switches
    const updatedBoard = await Board.findByPk(board.id, {
      include: [{ model: Switch, as: 'switches' }]
    });

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('board:updated', updatedBoard);

    res.json(updatedBoard);
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteBoard = async (req, res) => {
  try {
    const board = await Board.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Delete all related data (cascade should handle this)
    await board.destroy();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('board:deleted', { id: parseInt(req.params.id) });

    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBoardStats = async (req, res) => {
  try {
    const board = await Board.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: [{ model: Switch, as: 'switches' }]
    });

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const switches = board.switches || [];
    const totalSwitches = switches.length;
    const activeSwitches = switches.filter(s => s.state).length;
    const totalPower = switches.reduce((sum, s) => s.state ? sum + (s.power || 0) : sum, 0);

    // Count by mode
    const modeCounts = {
      0: switches.filter(s => s.mode === 0).length,
      1: switches.filter(s => s.mode === 1).length,
      2: switches.filter(s => s.mode === 2).length,
      3: switches.filter(s => s.mode === 3).length
    };

    // Get activity timeline (last 24 hours)
    const last24h = await Switch.findAll({
      where: { 
        boardId: board.id,
        lastActive: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      attributes: ['lastActive', 'state']
    });

    res.json({
      boardId: board.id,
      boardUid: board.uid,
      boardName: board.name,
      totalSwitches,
      activeSwitches,
      totalPower,
      modeCounts,
      isOnline: board.isOnline,
      lastSeen: board.lastSeen,
      uptime: board.isOnline ? calculateUptime(board.lastSeen) : 0,
      activityCount: last24h.length
    });
  } catch (error) {
    console.error('Get board stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.discoverBoards = async (req, res) => {
  try {
    // Send discovery command via MQTT
    mqttService.publishCommand('broadcast', 'DISCOVER');
    
    res.json({ message: 'Discovery initiated' });
  } catch (error) {
    console.error('Discover boards error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

function calculateUptime(lastSeen) {
  if (!lastSeen) return 0;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return Math.floor(diff / 1000); // seconds
}