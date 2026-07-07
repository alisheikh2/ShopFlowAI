const { initializeApp, cert } = require("firebase-admin/app");

let adminApp = null;

const getFirebaseAdmin = () => {
  if (!adminApp) {
    const serviceAccount = require("../config/firebase/shopflowai-firebase-adminsdk.json");
    adminApp = initializeApp({ credential: cert(serviceAccount) });
  }
  return adminApp;
};

module.exports = getFirebaseAdmin;