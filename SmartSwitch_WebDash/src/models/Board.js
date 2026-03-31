const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Board = sequelize.define('Board', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  uid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  icon: {
    type: DataTypes.STRING,
    defaultValue: 'microchip'
  },
  description: {
    type: DataTypes.TEXT
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
  firmwareVersion: {
    type: DataTypes.STRING,
    defaultValue: '1.0.0'
  },
  ipAddress: {
    type: DataTypes.STRING
  },
  lastSeen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

Board.associate = (models) => {
  Board.belongsTo(models.Place, { foreignKey: 'placeId', as: 'place' });
  Board.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  Board.hasMany(models.Switch, { foreignKey: 'boardId', as: 'switches', onDelete: 'CASCADE' });
  Board.hasMany(models.Schedule, { foreignKey: 'boardId', as: 'schedules' });
  Board.hasMany(models.Routine, { foreignKey: 'boardId', as: 'routines' });
};

module.exports = Board;