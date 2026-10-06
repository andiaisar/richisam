const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runSeed() {
  const client = await pool.connect();
  try {
    const seedsPath = path.join(__dirname, 'seeds.sql');
    const seedsSql = fs.readFileSync(seedsPath, 'utf-8');
    
    console.log('Menjalankan seeding database...');
    await client.query(seedsSql);
    console.log('Seeding berhasil dijalankan!');
  } catch (error) {
    console.error('Error saat menjalankan seeding:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runSeed();
