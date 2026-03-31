const { Schedule, Switch, Board, Place } = require('../models');
const { Op } = require('sequelize');
const cron = require('node-cron');

exports.getAllSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Switch,
          as: 'switch',
          attributes: ['id', 'name', 'index']
        },
        {
          model: Board,
          as: 'board',
          attributes: ['id', 'uid', 'name']
        },
        {
          model: Place,
          as: 'place',
          attributes: ['id', 'name']
        }
      ],
      order: [['nextRun', 'ASC']]
    });

    res.json(schedules);
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getScheduleById = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: [
        {
          model: Switch,
          as: 'switch'
        },
        {
          model: Board,
          as: 'board'
        },
        {
          model: Place,
          as: 'place'
        }
      ]
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.create({
      ...req.body,
      userId: req.user.id
    });

    // Calculate next run time
    if (schedule.cronExpression) {
      // In production, you'd calculate this properly
      schedule.nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await schedule.save();
    }

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('schedule:created', schedule);

    res.status(201).json(schedule);
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    await schedule.update(req.body);

    // Recalculate next run time if cron changed
    if (req.body.cronExpression && req.body.cronExpression !== schedule.cronExpression) {
      schedule.nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await schedule.save();
    }

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('schedule:updated', schedule);

    res.json(schedule);
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    await schedule.destroy();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('schedule:deleted', { id: parseInt(req.params.id) });

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.executeSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: [
        {
          model: Switch,
          as: 'switch',
          include: [{ model: Board, as: 'board' }]
        }
      ]
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    // Execute the schedule action
    if (schedule.switch) {
      const mqttService = require('../services/mqttService');
      mqttService.publishSwitchState(
        schedule.switch.board.uid,
        schedule.switch.index,
        schedule.action
      );
    }

    // Update last run
    await schedule.update({ lastRun: new Date() });

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('schedule:executed', {
      id: schedule.id,
      timestamp: new Date()
    });

    res.json({ message: 'Schedule executed successfully' });
  } catch (error) {
    console.error('Execute schedule error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
