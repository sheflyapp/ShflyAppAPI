const admin = require('firebase-admin');
const User = require('../models/User');

let messaging = null;

// Credentials come from FIREBASE_SERVICE_ACCOUNT (service account JSON string)
// or FIREBASE_SERVICE_ACCOUNT_PATH (path to the JSON file).
const getMessaging = () => {
  if (messaging) return messaging;

  let credentialSource = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    credentialSource = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    credentialSource = require(require('path').resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
  }
  if (!credentialSource) return null;

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(credentialSource) });
  }
  messaging = admin.messaging();
  return messaging;
};

const INVALID_TOKEN_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token'
];

/**
 * Send a push notification to all devices of a user.
 * Never throws: push is best-effort and must not break the calling request.
 */
const sendPushToUser = async (userId, { title, body, data = {} }) => {
  try {
    const fcm = getMessaging();
    if (!fcm) return; // Firebase not configured

    const user = await User.findById(userId).select('+fcmTokens');
    const tokens = user?.fcmTokens || [];
    if (!tokens.length) return;

    // FCM data payload values must be strings
    const stringData = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    );

    const response = await fcm.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: stringData
    });

    const invalidTokens = [];
    response.responses.forEach((r, i) => {
      if (!r.success && INVALID_TOKEN_CODES.includes(r.error?.code)) {
        invalidTokens.push(tokens[i]);
      }
    });
    if (invalidTokens.length) {
      await User.updateOne({ _id: userId }, { $pull: { fcmTokens: { $in: invalidTokens } } });
    }
  } catch (error) {
    console.error('Error sending push notification:', error.message);
  }
};

module.exports = { sendPushToUser };
