const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigrate() {
  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('Menjalankan migrasi database...');
    await client.query(schemaSql);
    console.log('Migrasi berhasil dijalankan!');
  } catch (error) {
    console.error('Error saat menjalankan migrasi:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigrate();
