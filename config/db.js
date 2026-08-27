const mysql = require('mysql2/promise');
require('dotenv').config();

const isCloudHost = process.env.DB_HOST && !['localhost', '127.0.0.1', '192.168.0.186'].includes(process.env.DB_HOST);
const useSsl = process.env.DB_SSL === 'true' || (process.env.DB_SSL !== 'false' && isCloudHost);

const dbConfig = process.env.DATABASE_URL
  ? {
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    }
  : {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'xmed_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      multipleStatements: true,
      ssl: useSsl ? { rejectUnauthorized: false } : false
    };

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// Execute parameterized query using standard text protocol
// Supporting stored procedures, DDL, views, and multiple statements
async function query(sql, params = []) {
  const currentPool = getPool();
  const [results] = await currentPool.query(sql, params);
  return results;
}

// Get a raw connection for multi-query ACID transactions
async function getConnection() {
  const currentPool = getPool();
  return await currentPool.getConnection();
}

module.exports = {
  dbConfig,
  getPool,
  query,
  getConnection
};
