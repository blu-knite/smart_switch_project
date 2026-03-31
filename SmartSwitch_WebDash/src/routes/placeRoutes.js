const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { placeValidation } = require('../middleware/validation');
const placeController = require('../controllers/placeController');

// All place routes require authentication
router.use(authenticate);

router.get('/', placeController.getAllPlaces);
router.get('/stats', placeController.getAllPlaces);
router.get('/:id', placeController.getPlaceById);
router.get('/:id/stats', placeController.getPlaceStats);
router.post('/', placeValidation.create, placeController.createPlace);
router.put('/:id', placeValidation.update, placeController.updatePlace);
router.delete('/:id', placeController.deletePlace);

module.exports = router;