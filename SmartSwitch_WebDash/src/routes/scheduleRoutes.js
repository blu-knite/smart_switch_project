const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { scheduleValidation } = require('../middleware/validation');
const scheduleController = require('../controllers/scheduleController');

// All schedule routes require authentication
router.use(authenticate);

router.get('/', scheduleController.getAllSchedules);
router.get('/:id', scheduleController.getScheduleById);
router.post('/', scheduleValidation.create, scheduleController.createSchedule);
router.put('/:id', scheduleValidation.update, scheduleController.updateSchedule);
router.delete('/:id', scheduleController.deleteSchedule);
router.post('/:id/execute', scheduleController.executeSchedule);

module.exports = router;
