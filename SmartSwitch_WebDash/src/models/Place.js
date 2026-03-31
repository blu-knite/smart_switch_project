const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Place = sequelize.define('Place', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  icon: {
    type: DataTypes.STRING,
    defaultValue: 'home'
  },
  address: {
    type: DataTypes.STRING
  },
  latitude: {
    type: DataTypes.FLOAT
  },
  longitude: {
    type: DataTypes.FLOAT
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

Place.associate = (models) => {
  Place.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  Place.hasMany(models.Board, { foreignKey: 'placeId', as: 'boards' });
  Place.hasMany(models.Schedule, { foreignKey: 'placeId', as: 'schedules' });
  Place.hasMany(models.Routine, { foreignKey: 'placeId', as: 'routines' });
};

module.exports = Place;