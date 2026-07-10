require("dotenv").config();
const validateEnv = require("../config/validateEnv");
const connectDB = require("../database/connectDB");
const { runCommerceTasks } = require("../workers/commerce.worker");
const mongoose = require("mongoose");

const run = async () => {
  try {
    validateEnv();
    await connectDB();
    const result = await runCommerceTasks();
    console.log("Commerce worker completed:", result);
  } catch (error) {
    console.error("Commerce worker run failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

void run();
