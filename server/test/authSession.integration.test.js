require("../test-support/testEnv");
const test = require("node:test");
const assert = require("node:assert/strict");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const userService = require("../src/services/user.service");
const generateTokens = require("../src/utils/generateTokens");
const { hashToken } = require("../src/utils/tokenHash");

let mongo;

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri("auth_session_integration"));
});

test.after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test("verification, reset and hashed refresh-token rotation work end to end", async () => {
  const registered = await userService.registerUser({
    name: "Auth Test",
    email: "auth-integration@example.com",
    password: "Strong!Pass123",
  });
  await userService.verifyEmail(registered.verificationToken);
  const loggedIn = await userService.loginUser({
    email: "auth-integration@example.com",
    password: "Strong!Pass123",
  });
  assert.equal(loggedIn.isEmailVerified, true);

  const first = await generateTokens(loggedIn._id);
  let storedUser = await User.findById(loggedIn._id);
  assert.equal(storedUser.refreshToken.includes(first.refreshToken), false);
  assert.equal(storedUser.refreshToken.includes(hashToken(first.refreshToken)), true);

  const second = await generateTokens(loggedIn._id, first.refreshToken);
  assert.notEqual(first.refreshToken, second.refreshToken);
  storedUser = await User.findById(loggedIn._id);
  assert.equal(storedUser.refreshToken.includes(hashToken(first.refreshToken)), false);
  assert.equal(storedUser.refreshToken.includes(hashToken(second.refreshToken)), true);

  await userService.logoutUser(loggedIn._id, second.refreshToken);
  storedUser = await User.findById(loggedIn._id);
  assert.equal(storedUser.refreshToken.includes(hashToken(second.refreshToken)), false);

  const reset = await userService.forgotPassword("auth-integration@example.com");
  await userService.resetPassword(reset.resetToken, "New!StrongPass456");
  const afterReset = await userService.loginUser({
    email: "auth-integration@example.com",
    password: "New!StrongPass456",
  });
  assert.equal(afterReset.email, "auth-integration@example.com");
});

test("a legacy raw refresh token migrates to hashed storage on rotation", async () => {
  const user = await User.create({
    name: "Legacy Session",
    email: "legacy-session@example.com",
    password: "Strong!Pass123",
    isEmailVerified: true,
  });
  const legacyRawToken = user.generateRefreshToken();
  user.refreshToken = [legacyRawToken];
  await user.save({ validateBeforeSave: false });

  const rotated = await generateTokens(user._id, legacyRawToken);
  const storedUser = await User.findById(user._id);
  assert.equal(storedUser.refreshToken.includes(legacyRawToken), false);
  assert.equal(storedUser.refreshToken.includes(hashToken(rotated.refreshToken)), true);
});

test("resending verification invalidates the previous token", async () => {
  const registered = await userService.registerUser({
    name: "Resend Test",
    email: "resend-integration@example.com",
    password: "Strong!Pass123",
  });
  const resent = await userService.resendVerification("resend-integration@example.com");
  await assert.rejects(
    userService.verifyEmail(registered.verificationToken),
    /Invalid or expired/,
  );
  await userService.verifyEmail(resent.verificationToken);
});
