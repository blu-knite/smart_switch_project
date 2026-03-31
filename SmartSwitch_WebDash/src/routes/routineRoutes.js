const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { routineValidation } = require('../middleware/validation');
const routineController = require('../controllers/routineController');

// All routine routes require authentication
router.use(authenticate);

// CRUD operations
router.get('/', routineController.getAllRoutines);
router.get('/:id', routineController.getRoutineById);
router.get('/:id/stats', routineController.getRoutineStats);
router.post('/', routineValidation.create, routineController.createRoutine);
router.put('/:id', routineValidation.update, routineController.updateRoutine);
router.delete('/:id', routineController.deleteRoutine);

// Execution and control
router.post('/:id/execute', routineController.executeRoutine);
router.post('/:id/toggle', routineController.toggleRoutine);
router.post('/bulk/toggle', routineController.bulkToggleRoutines);

// AI suggestions
router.get('/ai/suggestions', routineController.getAIRoutineSuggestions);

module.exports = router;