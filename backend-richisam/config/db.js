const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      ...(process.env.DB_SSL === 'true' && { ssl: { rejectUnauthorized: false } })
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('✅ Terhubung ke pool PostgreSQL');
});

module.exports = pool;
