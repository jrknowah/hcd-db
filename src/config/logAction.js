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

    // 🔒 Optional: send to your backend
    // await fetch(`${import.meta.env.VITE_API_URL}/logs`, {
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

export default logUserAction;
