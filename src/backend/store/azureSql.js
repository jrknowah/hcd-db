// store/azureSql.js
require('dotenv').config({ path: '../../.env' });
const sql = require('mssql');
const { DefaultAzureCredential } = require('@azure/identity');

let pool;
let credential;

const config = {
  server: process.env.AZURE_SQL_SERVER,  // or process.env.SQL_SERVER
  database: process.env.AZURE_SQL_DATABASE,  // or process.env.SQL_DATABASE
  user: process.env.AZURE_SQL_USER,  // or process.env.SQL_USER
  password: process.env.AZURE_SQL_PASSWORD,  // or process.env.SQL_PASSWORD
  
  options: {
    encrypt: true,
    trustServerCertificate: false
  },
  authentication: {
    type: 'azure-active-directory-default'
  }
};

const getPool = async () => {
  console.log('Environment check:');
console.log('Server:', process.env.AZURE_SQL_SERVER ? 'FOUND' : 'NOT FOUND');
console.log('Database:', process.env.AZURE_SQL_DATABASE ? 'FOUND' : 'NOT FOUND');
console.log('User:', process.env.AZURE_SQL_USER ? 'FOUND' : 'NOT FOUND');
console.log('Password:', process.env.AZURE_SQL_PASSWORD ? 'FOUND' : 'NOT FOUND');
  try {
    if (!pool) {
      credential = new DefaultAzureCredential();
      pool = await sql.connect(config);
      console.log('✅ Connected to Azure SQL Database');
    }

    // Check if pool is connected, reconnect if needed
    if (!pool.connected) {
      console.log('🔄 Reconnecting to Azure SQL Database...');
      await pool.close();
      pool = await sql.connect(config);
    }

    return pool;
  } catch (error) {
    console.error('❌ Azure SQL connection error:', error);
    
    // If token expired, reset pool and try again
    if (error.code === 'ELOGIN') {
      console.log('🔄 Token expired, creating new connection...');
      pool = null;
      return await getPool();
    }
    
    throw error;
  }
};

module.exports = { getPool };