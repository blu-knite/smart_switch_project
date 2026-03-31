const { Routine, Board, Switch, Place } = require('../models');
const mqttService = require('../services/mqttService');
const { Op } = require('sequelize');

exports.getAllRoutines = async (req, res) => {
  try {
    const routines = await Routine.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Board,
          as: 'board',
          attributes: ['id', 'uid', 'name', 'icon', 'isOnline']
        },
        {
          model: Place,
          as: 'place',
          attributes: ['id', 'name', 'icon']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Add execution stats
    const routinesWithStats = routines.map(routine => {
      const routineJson = routine.toJSON();
      routineJson.lastExecutedFormatted = routine.lastExecuted ? new Date(routine.lastExecuted).toLocaleString() : null;
      return routineJson;
    });

    res.json(routinesWithStats);
  } catch (error) {
    console.error('Get routines error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getRoutineById = async (req, res) => {
  try {
    const routine = await Routine.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: [
        {
          model: Board,
          as: 'board',
          attributes: ['id', 'uid', 'name', 'icon']
        },
        {
          model: Place,
          as: 'place',
          attributes: ['id', 'name', 'icon']
        }
      ]
    });

    if (!routine) {
      return res.status(404).json({ message: 'Routine not found' });
    }

    res.json(routine);
  } catch (error) {
    console.error('Get routine error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createRoutine = async (req, res) => {
  try {
    const { name, description, boardId, placeId, actions, trigger, triggerConfig, enabled } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Routine name is required' });
    }

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({ message: 'At least one action is required' });
    }

    // Validate board exists if provided
    if (boardId) {
      const board = await Board.findOne({
        where: { id: boardId, userId: req.user.id }
      });
      if (!board) {
        return res.status(400).json({ message: 'Board not found or unauthorized' });
      }
    }

    // Validate place exists if provided
    if (placeId) {
      const place = await Place.findOne({
        where: { id: placeId, userId: req.user.id }
      });
      if (!place) {
        return res.status(400).json({ message: 'Place not found or unauthorized' });
      }
    }

    const routine = await Routine.create({
      name,
      description: description || null,
      boardId: boardId || null,
      placeId: placeId || null,
      userId: req.user.id,
      actions,
      trigger: trigger || 'manual',
      triggerConfig: triggerConfig || {},
      enabled: enabled !== undefined ? enabled : true,
      isAIGenerated: false,
      confidence: 0,
      executionCount: 0
    });

    // Fetch the created routine with associations
    const newRoutine = await Routine.findByPk(routine.id, {
      include: [
        { model: Board, as: 'board', attributes: ['id', 'uid', 'name'] },
        { model: Place, as: 'place', attributes: ['id', 'name'] }
      ]
    });

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('routine:created', newRoutine);

    res.status(201).json(newRoutine);
  } catch (error) {
    console.error('Create routine error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateRoutine = async (req, res) => {
  try {
    const routine = await Routine.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!routine) {
      return res.status(404).json({ message: 'Routine not found' });
    }

    const { name, description, boardId, placeId, actions, trigger, triggerConfig, enabled } = req.body;

    // Validate board exists if provided
    if (boardId) {
      const board = await Board.findOne({
        where: { id: boardId, userId: req.user.id }
      });
      if (!board) {
        return res.status(400).json({ message: 'Board not found or unauthorized' });
      }
    }

    // Validate place exists if provided
    if (placeId) {
      const place = await Place.findOne({
        where: { id: placeId, userId: req.user.id }
      });
      if (!place) {
        return res.status(400).json({ message: 'Place not found or unauthorized' });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (boardId !== undefined) updateData.boardId = boardId || null;
    if (placeId !== undefined) updateData.placeId = placeId || null;
    if (actions !== undefined) updateData.actions = actions;
    if (trigger !== undefined) updateData.trigger = trigger;
    if (triggerConfig !== undefined) updateData.triggerConfig = triggerConfig;
    if (enabled !== undefined) updateData.enabled = enabled;

    await routine.update(updateData);

    // Fetch updated routine with associations
    const updatedRoutine = await Routine.findByPk(routine.id, {
      include: [
        { model: Board, as: 'board', attributes: ['id', 'uid', 'name'] },
        { model: Place, as: 'place', attributes: ['id', 'name'] }
      ]
    });

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('routine:updated', updatedRoutine);

    res.json(updatedRoutine);
  } catch (error) {
    console.error('Update routine error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteRoutine = async (req, res) => {
  try {
    const routine = await Routine.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!routine) {
      return res.status(404).json({ message: 'Routine not found' });
    }

    await routine.destroy();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('routine:deleted', { id: parseInt(req.params.id) });

    res.json({ message: 'Routine deleted successfully' });
  } catch (error) {
    console.error('Delete routine error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.executeRoutine = async (req, res) => {
  try {
    const routine = await Routine.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: [
        { 
          model: Board, 
          as: 'board',
          include: [{ model: Switch, as: 'switches' }]
        }
      ]
    });

    if (!routine) {
      return res.status(404).json({ message: 'Routine not found' });
    }

    if (!routine.enabled) {
      return res.status(400).json({ message: 'Routine is disabled' });
    }

    if (!routine.board) {
      return res.status(400).json({ message: 'No board associated with this routine' });
    }

    if (!routine.board.isOnline) {
      return res.status(400).json({ message: 'Board is offline' });
    }

    // Execute each action in the routine
    const actions = routine.actions;
    const board = routine.board;
    const results = [];

    if (board && actions && actions.length > 0) {
      for (const action of actions) {
        try {
          // Find switch by index or name
          let targetSwitch = null;
          
          if (action.switchIndex) {
            targetSwitch = board.switches?.find(s => s.index === action.switchIndex);
          } else if (action.switchId) {
            targetSwitch = board.switches?.find(s => s.id === action.switchId);
          } else if (action.target) {
            targetSwitch = board.switches?.find(s => s.name === action.target);
          }

          if (targetSwitch) {
            const command = action.action || action.state || 'ON';
            const isOn = command === 'ON' || command === 'on' || command === true;
            
            // Update switch state in database
            await targetSwitch.update({ 
              state: isOn,
              lastActive: new Date()
            });
            
            // Send MQTT command
            const mqttSuccess = mqttService.publishSwitchState(
              board.uid,
              targetSwitch.index,
              isOn ? 'ON' : 'OFF'
            );
            
            results.push({
              switchId: targetSwitch.id,
              switchName: targetSwitch.name,
              action: command,
              success: mqttSuccess,
              timestamp: new Date()
            });
          } else {
            results.push({
              action: action,
              success: false,
              error: 'Switch not found'
            });
          }
          
          // Small delay between actions
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (actionError) {
          console.error('Error executing action:', actionError);
          results.push({
            action: action,
            success: false,
            error: actionError.message
          });
        }
      }
    }

    // Update execution stats
    await routine.update({
      lastExecuted: new Date(),
      executionCount: (routine.executionCount || 0) + 1
    });

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('routine:executed', {
      id: routine.id,
      name: routine.name,
      results: results,
      timestamp: new Date()
    });

    const successCount = results.filter(r => r.success !== false).length;
    const failCount = results.length - successCount;

    res.json({
      message: 'Routine executed successfully',
      routineId: routine.id,
      routineName: routine.name,
      results: results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount
      }
    });
  } catch (error) {
    console.error('Execute routine error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.toggleRoutine = async (req, res) => {
  try {
    const routine = await Routine.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!routine) {
      return res.status(404).json({ message: 'Routine not found' });
    }

    routine.enabled = !routine.enabled;
    await routine.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('routine:toggled', {
      id: routine.id,
      enabled: routine.enabled,
      timestamp: new Date()
    });

    res.json({
      id: routine.id,
      enabled: routine.enabled,
      message: `Routine ${routine.enabled ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    console.error('Toggle routine error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getRoutineStats = async (req, res) => {
  try {
    const routine = await Routine.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!routine) {
      return res.status(404).json({ message: 'Routine not found' });
    }

    // Calculate stats
    const totalExecutions = routine.executionCount || 0;
    const lastExecuted = routine.lastExecuted;
    const successRate = routine.successCount && totalExecutions > 0 
      ? Math.round((routine.successCount / totalExecutions) * 100) 
      : 100;

    res.json({
      id: routine.id,
      name: routine.name,
      enabled: routine.enabled,
      totalExecutions,
      lastExecuted,
      successRate,
      createdAt: routine.createdAt,
      updatedAt: routine.updatedAt
    });
  } catch (error) {
    console.error('Get routine stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.bulkToggleRoutines = async (req, res) => {
  try {
    const { routineIds, enabled } = req.body;

    if (!routineIds || !Array.isArray(routineIds) || routineIds.length === 0) {
      return res.status(400).json({ message: 'Invalid routine IDs' });
    }

    const routines = await Routine.findAll({
      where: {
        id: routineIds,
        userId: req.user.id
      }
    });

    if (routines.length === 0) {
      return res.status(404).json({ message: 'No routines found' });
    }

    const results = [];
    for (const routine of routines) {
      routine.enabled = enabled;
      await routine.save();
      results.push({ id: routine.id, name: routine.name, enabled: routine.enabled });
    }

    // Emit bulk update event
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('routines:bulk-toggled', {
      routineIds,
      enabled,
      results,
      timestamp: new Date()
    });

    res.json({
      message: `${results.length} routines ${enabled ? 'enabled' : 'disabled'}`,
      results
    });
  } catch (error) {
    console.error('Bulk toggle routines error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAIRoutineSuggestions = async (req, res) => {
  try {
    // Get user's switches and their usage patterns
    const switches = await Switch.findAll({
      include: [{
        model: Board,
        as: 'board',
        where: { userId: req.user.id }
      }]
    });

    // Analyze usage patterns and generate suggestions
    const suggestions = [];

    // Check for frequently used switches that could be automated
    const frequentlyUsed = switches.filter(s => {
      const lastActive = new Date(s.lastActive);
      const daysSinceActive = (Date.now() - lastActive) / (1000 * 60 * 60 * 24);
      return daysSinceActive < 7 && s.state === true;
    });

    if (frequentlyUsed.length > 0) {
      suggestions.push({
        type: 'automation',
        title: 'Frequently Used Devices',
        description: `You frequently use ${frequentlyUsed.map(s => s.name).join(', ')}. Consider creating a routine to automate them.`,
        confidence: 85,
        actions: frequentlyUsed.map(s => ({
          switchId: s.id,
          switchName: s.name,
          suggestedAction: 'ON'
        }))
      });
    }

    // Check for devices that are often on together
    const boards = await Board.findAll({
      where: { userId: req.user.id },
      include: [{ model: Switch, as: 'switches' }]
    });

    for (const board of boards) {
      const activeSwitches = board.switches?.filter(s => s.state === true) || [];
      if (activeSwitches.length >= 2) {
        suggestions.push({
          type: 'group',
          title: 'Group Automation',
          description: `Create a "Movie Time" or "Work Mode" routine for ${board.name}`,
          confidence: 75,
          actions: activeSwitches.map(s => ({
            switchId: s.id,
            switchName: s.name,
            suggestedAction: 'ON'
          }))
        });
        break;
      }
    }

    // Energy saving suggestion
    const highPowerSwitches = switches.filter(s => s.power > 100 && s.state === true);
    if (highPowerSwitches.length > 0) {
      suggestions.push({
        type: 'energy',
        title: 'Energy Saving Opportunity',
        description: `High-power devices (${highPowerSwitches.map(s => s.name).join(', ')}) are currently on. Consider scheduling them to turn off when not in use.`,
        confidence: 90,
        actions: highPowerSwitches.map(s => ({
          switchId: s.id,
          switchName: s.name,
          suggestedAction: 'OFF'
        }))
      });
    }

    res.json({ suggestions });
  } catch (error) {
    console.error('Get AI routine suggestions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};