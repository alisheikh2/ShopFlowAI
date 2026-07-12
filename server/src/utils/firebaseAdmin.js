const { initializeApp, cert } = require("firebase-admin/app");

let adminApp = null;

const loadServiceAccount = () => {
  // Preferred: env var (used on Render/Vercel/any host where a local JSON file isn't available)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (err) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: " + err.message,
      );
    }
  }

  // Fallback: local JSON file (used in local development)
  try {
    return require("../config/firebase/shopflowai-firebase-adminsdk.json");
  } catch (err) {
    throw new Error(
      "Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT_JSON env var " +
        "or place the JSON file at server/src/config/firebase/shopflowai-firebase-adminsdk.json",
    );
  }
};

const getFirebaseAdmin = () => {
  if (!adminApp) {
    const serviceAccount = loadServiceAccount();
    adminApp = initializeApp({ credential: cert(serviceAccount) });
  }
  return adminApp;
};

module.exports = getFirebaseAdmin;