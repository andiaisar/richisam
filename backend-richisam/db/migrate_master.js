const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigrateMasterData() {
  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, 'migration_master_data.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('Menjalankan migrasi skema master data (Prompt I1)...');
    await client.query(migrationSql);
    console.log('✅ Migrasi skema master data berhasil dijalankan!');
  } catch (error) {
    console.error('❌ Error saat menjalankan migrasi master data:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrateMasterData();
