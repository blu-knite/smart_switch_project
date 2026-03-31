const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { boardValidation } = require('../middleware/validation');
const boardController = require('../controllers/boardController');

// All board routes require authentication
router.use(authenticate);

router.get('/', boardController.getAllBoards);
router.get('/stats', boardController.getAllBoards);
router.get('/:id', boardController.getBoardById);
router.get('/uid/:uid', boardController.getBoardByUid);
router.get('/:id/stats', boardController.getBoardStats);
router.post('/', boardValidation.create, boardController.createBoard);
router.put('/:id', boardValidation.update, boardController.updateBoard);
router.delete('/:id', boardController.deleteBoard);

module.exports = router;
