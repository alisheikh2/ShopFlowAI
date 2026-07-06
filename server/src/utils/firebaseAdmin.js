const { initializeApp, cert } = require("firebase-admin/app");

const serviceAccount = require("../config/firebase/shopflowai-firebase-adminsdk.json");

const admin = initializeApp({
  credential: cert(serviceAccount),
});

module.exports = admin;