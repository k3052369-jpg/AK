const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const sslEnabled = ['true', 'required', 'require'].includes(
  String(process.env.DB_SSL || '').toLowerCase()
);

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

const pool = databaseUrl
  ? mysql.createPool(databaseUrl)
  : mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'auto_part_db',
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4'
    });

module.exports = pool;
