// src/config/logAction.js
const logUserAction = async (userEmail, actionType, details = {}) => {
  try {
    const payload = {
      userEmail,
      actionType,
      timestamp: new Date().toISOString(),
      details,
    };

    console.log("🔍 User Action Logged:", payload);

    // Optional: send to your backend
    // const API_URL = import.meta.env.VITE_API_URL || 'https://hcd-db-backend-fdfmekfgehbhf0db.westus2-01.azurewebsites.net';
    // await fetch(`${API_URL}/api/logs`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(payload),
    // });

  } catch (error) {
    console.error("❌ Failed to log user action:", error);
  }
};

// Define middleware function (if needed in frontend)
const logMiddleware = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
};

// ✅ Use ONLY ES6 exports for frontend
export default logUserAction;
export { logUserAction, logMiddleware };