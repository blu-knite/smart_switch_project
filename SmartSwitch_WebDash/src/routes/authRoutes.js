const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authValidation } = require('../middleware/validation');
const authController = require('../controllers/authController');

// Public routes
router.post('/register', authValidation.register, authController.register);
router.post('/login', authValidation.login, authController.login);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/refresh-token', authenticate, authController.refreshToken);

module.exports = router;