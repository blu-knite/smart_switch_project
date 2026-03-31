const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { MODES } = require('../utils/constants');

const Switch = sequelize.define('Switch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  boardId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Boards',
      key: 'id'
    }
  },
  index: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 8
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Switch'
  },
  icon: {
    type: DataTypes.STRING,
    defaultValue: 'lightbulb'
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: 'primary'
  },
  state: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  mode: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    validate: {
      isIn: [[0, 1, 2, 3]]
    }
  },
  power: {
    type: DataTypes.INTEGER,
    defaultValue: 60
  },
  room: {
    type: DataTypes.STRING
  },
  lastActive: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['boardId', 'index']
    }
  ]
});

Switch.associate = (models) => {
  Switch.belongsTo(models.Board, { foreignKey: 'boardId', as: 'board' });
  Switch.hasMany(models.Schedule, { foreignKey: 'switchId', as: 'schedules' });
};

// Virtual for mode name
Switch.prototype.getModeName = function() {
  const modes = require('../utils/constants').MODES;
  return modes[this.mode]?.name || 'UNKNOWN';
};

// Virtual for mode description
Switch.prototype.getModeDescription = function() {
  const modes = require('../utils/constants').MODES;
  return modes[this.mode]?.description || 'Unknown mode';
};

Switch.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  values.modeName = this.getModeName();
  values.modeDescription = this.getModeDescription();
  return values;
};

module.exports = Switch;