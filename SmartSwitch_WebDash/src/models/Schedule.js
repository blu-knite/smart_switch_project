const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Schedule = sequelize.define('Schedule', {
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
  switchId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Switches',
      key: 'id'
    }
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
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mode: {
    type: DataTypes.ENUM('manual', 'ai', 'presence', 'all'),
    defaultValue: 'manual'
  },
  cronExpression: {
    type: DataTypes.STRING
  },
  startTime: {
    type: DataTypes.TIME
  },
  endTime: {
    type: DataTypes.TIME
  },
  daysOfWeek: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastRun: {
    type: DataTypes.DATE
  },
  nextRun: {
    type: DataTypes.DATE
  }
});

Schedule.associate = (models) => {
  Schedule.belongsTo(models.Switch, { foreignKey: 'switchId', as: 'switch' });
  Schedule.belongsTo(models.Board, { foreignKey: 'boardId', as: 'board' });
  Schedule.belongsTo(models.Place, { foreignKey: 'placeId', as: 'place' });
  Schedule.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
};

module.exports = Schedule;