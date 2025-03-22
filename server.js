const express = require("express");
const contactRoutes = require("./routes/contactRoutes");
const sequelize = require("./config/database");

const app = express();
app.use(express.json());
app.use("/", contactRoutes);

async function startServer() {
  try {
    await sequelize.sync();
    console.log("Database synchronized");

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize app:", error);
  }
}

startServer();

module.exports = app;
