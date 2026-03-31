const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { switchValidation } = require('../middleware/validation');
const switchController = require('../controllers/switchController');

// All switch routes require authentication
router.use(authenticate);

router.get('/', switchController.getAllSwitches);
router.get('/:id', switchController.getSwitchById);
router.put('/:id', switchValidation.update, switchController.updateSwitch);
router.post('/:id/toggle', switchController.toggleSwitch);
router.post('/:id/mode', switchController.setSwitchMode);
router.post('/bulk/update', switchController.bulkUpdateSwitches);

module.exports = router;
