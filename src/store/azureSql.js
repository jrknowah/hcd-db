// backend/db/azureSql.js
const sql = require("mssql");
const { DefaultAzureCredential } = require("@azure/identity");

const credential = new DefaultAzureCredential();
let poolPromise = null;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectToAzureSQL(retries = 3) {
  try {
    console.log("🔄 Attempting to connect to Azure SQL...");

    const tokenResponse = await credential.getToken("https://database.windows.net");

    const config = {
      server: "cch-server.database.windows.net",
      database: "clientDemo",
      authentication: {
        type: "azure-active-directory-access-token",
        options: { token: tokenResponse.token },
      },
      options: {
        encrypt: true,
        trustServerCertificate: false,
      },
    };

    poolPromise = new sql.ConnectionPool(config).connect();
    await poolPromise;

    console.log("✅ Successfully connected to Azure SQL!");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    if (retries > 0) {
      console.log(`🔄 Retrying (${retries} attempts left)...`);
      await delay(5000);
      return connectToAzureSQL(retries - 1);
    } else {
      console.error("❌ All retries failed.");
      process.exit(1);
    }
  }
}

module.exports = {
  connectToAzureSQL,
  getPool: () => poolPromise,
};
