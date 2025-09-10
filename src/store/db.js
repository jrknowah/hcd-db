require('dotenv').config();
const sql = require('mssql');
const { getPool } = require('./azureSql'); // Import your Azure connection

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: process.env.SQL_ENCRYPT === 'true',
    enableArithAbort: true,
    trustServerCertificate: process.env.NODE_ENV === 'development',
    requestTimeout: 60000,
    connectionTimeout: 60000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Helper function to get the active pool (Azure first, fallback to regular)
const getActivePool = async () => {
  try {
    // Try Azure connection first
    const azurePool = getPool();
    if (azurePool) {
      return await azurePool;
    }
  } catch (error) {
    console.log('🔄 Azure connection not available, using fallback...');
  }
  
  // Fallback to regular SQL connection for development
  if (!module.exports.poolPromise) {
    module.exports.poolPromise = new sql.ConnectionPool(sqlConfig)
      .connect()
      .then(pool => {
        console.log('✅ Connected to SQL Server (fallback)');
        return pool;
      })
      .catch(err => {
        console.error('❌ Database Connection Failed:', err);
        throw err;
      });
  }
  
  return await module.exports.poolPromise;
};

module.exports = { 
  sqlConfig, 
  sql,
  getActivePool, // Export the helper function
  poolPromise: null // Will be set if fallback is used
};