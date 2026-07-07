require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/database/connectDB");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;

let server;

const startServer = async () => {
  try {
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      console.log("HTTP server closed.");

      try {
        await mongoose.disconnect();
        console.log("MongoDB disconnected.");
      } catch (err) {
        console.error("Error during MongoDB disconnect:", err.message);
      }

      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force-exit if shutdown hangs
  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  // Let it crash intentionally so process managers (pm2/docker) can restart cleanly
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

startServer();