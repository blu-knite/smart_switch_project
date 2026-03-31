const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const authValidation = {
  register: [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty().trim(),
    validate
  ],
  login: [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validate
  ]
};

const placeValidation = {
  create: [
    body('name').notEmpty().trim(),
    body('icon').optional(),
    body('address').optional().trim(),
    validate
  ],
  update: [
    body('name').optional().notEmpty().trim(),
    body('icon').optional(),
    body('address').optional().trim(),
    body('isActive').optional().isBoolean(),
    validate
  ]
};

const boardValidation = {
  create: [
    body('uid').notEmpty().trim(),
    body('name').notEmpty().trim(),
    body('placeId').optional().isInt(),
    body('icon').optional(),
    body('description').optional().trim(),
    validate
  ],
  update: [
    body('name').optional().notEmpty().trim(),
    body('icon').optional(),
    body('description').optional().trim(),
    body('isOnline').optional().isBoolean(),
    validate
  ]
};

const switchValidation = {
  update: [
    body('name').optional().notEmpty().trim(),
    body('icon').optional(),
    body('color').optional(),
    body('power').optional().isInt({ min: 0 }),
    body('room').optional().trim(),
    body('settings').optional().isObject(),
    validate
  ]
};

const scheduleValidation = {
  create: [
    body('name').notEmpty().trim(),
    body('action').notEmpty(),
    body('mode').isIn(['manual', 'ai', 'presence', 'all']),
    body('cronExpression').optional(),
    body('startTime').optional(),
    body('endTime').optional(),
    body('daysOfWeek').optional().isArray(),
    validate
  ],
  update: [
    body('name').optional().notEmpty().trim(),
    body('action').optional().notEmpty(),
    body('isActive').optional().isBoolean(),
    validate
  ]
};

const routineValidation = {
  create: [
    body('name').notEmpty().trim(),
    body('actions').isArray(),
    body('trigger').isIn(['manual', 'time', 'device', 'presence', 'weather']),
    body('triggerConfig').optional().isObject(),
    validate
  ],
  update: [
    body('name').optional().notEmpty().trim(),
    body('enabled').optional().isBoolean(),
    body('actions').optional().isArray(),
    validate
  ]
};

module.exports = {
  validate,
  authValidation,
  placeValidation,
  boardValidation,
  switchValidation,
  scheduleValidation,
  routineValidation
};
