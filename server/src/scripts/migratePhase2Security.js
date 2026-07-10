require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../database/connectDB");
const User = require("../models/user.model");
const { hashToken } = require("../utils/tokenHash");

const isSha256Hash = (value) => /^[a-f0-9]{64}$/i.test(String(value || ""));

const migrate = async () => {
  try {
    await connectDB();
    const users = await User.find({ "refreshToken.0": { $exists: true } }).select(
      "refreshToken",
    );
    let usersUpdated = 0;
    let tokensHashed = 0;

    for (const user of users) {
      const normalized = user.refreshToken.map((token) => {
        if (isSha256Hash(token)) return token;
        tokensHashed += 1;
        return hashToken(token);
      });
      const uniqueTokens = [...new Set(normalized)];
      if (
        uniqueTokens.length !== user.refreshToken.length ||
        uniqueTokens.some((token, index) => token !== user.refreshToken[index])
      ) {
        user.refreshToken = uniqueTokens;
        await user.save({ validateBeforeSave: false });
        usersUpdated += 1;
      }
    }

    console.log({ usersUpdated, tokensHashed });
  } catch (error) {
    console.error("Phase 2 security migration failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

void migrate();
