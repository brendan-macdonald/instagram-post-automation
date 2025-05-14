// initialize sequelize with sqlite
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
  logging: false,
});

// export the sequelize instance
// this will be used in the models to connect to the database
module.exports = sequelize;
