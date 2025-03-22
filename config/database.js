const { Sequelize } = require("sequelize");
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./contacts.sqlite",
  logging: false,
});
module.exports = sequelize;
