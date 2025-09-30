// store/azureSql.js - Azure SQL Database Connection Module
const sql = require('mssql');

// Configuration for Azure SQL Database
const config = {
  user: process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  database: process.env.AZURE_SQL_DATABASE,
  server: process.env.AZURE_SQL_SERVER,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true, // Required for Azure
    trustServerCertificate: false, // Change to true for local dev / self-signed certs
    enableArithAbort: true
  }
};

// Create a connection pool
let poolPromise = null;

const connectToAzureSQL = async () => {
  try {
    if (!poolPromise) {
      console.log('🔄 Creating new Azure SQL connection pool...');
      poolPromise = sql.connect(config);
      const pool = await poolPromise;
      console.log('✅ Connected to Azure SQL Database');
      
      // Test the connection
      const result = await pool.request().query('SELECT 1 as test');
      console.log('✅ Azure SQL connection test successful');
      
      return pool;
    }
    return poolPromise;
  } catch (err) {
    console.error('❌ Azure SQL Connection Error:', err);
    poolPromise = null; // Reset on error
    throw err;
  }
};

// Get the existing pool or create a new one
const getPool = async () => {
  if (!poolPromise) {
    return connectToAzureSQL();
  }
  
  try {
    const pool = await poolPromise;
    // Test if connection is still alive
    await pool.request().query('SELECT 1');
    return pool;
  } catch (err) {
    console.log('🔄 Reconnecting to Azure SQL...');
    poolPromise = null;
    return connectToAzureSQL();
  }
};

// Close the connection pool
const closePool = async () => {
  try {
    if (poolPromise) {
      const pool = await poolPromise;
      await pool.close();
      poolPromise = null;
      console.log('✅ Azure SQL connection pool closed');
    }
  } catch (err) {
    console.error('❌ Error closing Azure SQL pool:', err);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, closing Azure SQL connection...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, closing Azure SQL connection...');
  await closePool();
  process.exit(0);
});

module.exports = {
  poolPromise: connectToAzureSQL(),
  connectToAzureSQL,
  getPool,
  closePool,
  sql
};