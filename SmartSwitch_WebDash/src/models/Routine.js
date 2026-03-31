const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Routine = sequelize.define('Routine', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  boardId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Boards',
      key: 'id'
    }
  },
  placeId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Places',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  actions: {
    type: DataTypes.JSON,
    allowNull: false
  },
  trigger: {
    type: DataTypes.ENUM('manual', 'time', 'device', 'presence', 'weather'),
    defaultValue: 'manual'
  },
  triggerConfig: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isAIGenerated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  confidence: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  lastExecuted: {
    type: DataTypes.DATE
  },
  executionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  successCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastError: {
    type: DataTypes.TEXT
  }
});

Routine.associate = (models) => {
  Routine.belongsTo(models.Board, { foreignKey: 'boardId', as: 'board' });
  Routine.belongsTo(models.Place, { foreignKey: 'placeId', as: 'place' });
  Routine.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
};

module.exports = Routine;