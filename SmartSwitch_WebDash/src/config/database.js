const { Sequelize } = require('sequelize');
const config = require('config');

const dbConfig = config.get('database');

const sequelize = new Sequelize(
  dbConfig.name,
  dbConfig.user,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'mysql',
    logging: config.get('env') === 'development' ? console.log : false,
    pool: dbConfig.pool
  }
);

module.exports = sequelize;