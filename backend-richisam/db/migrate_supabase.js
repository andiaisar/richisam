const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigrateSupabase() {
  const urlsToTry = [
    process.env.DATABASE_URL,
    // Direct connection fallback
    'postgresql://postgres:RichiSam2026!@db.nbpfbprkscgltdzfrcre.supabase.co:5432/postgres',
    // Session pooler fallback
    'postgresql://postgres.nbpfbprkscgltdzfrcre:RichiSam2026!@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres',
    // URL-encoded exclamation mark fallback
    'postgresql://postgres.nbpfbprkscgltdzfrcre:RichiSam2026%21@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres'
  ];

  let pool = null;
  let client = null;
  let connectedUrl = null;

  for (const url of urlsToTry) {
    try {
      console.log(`🔄 Mencoba menghubungkan ke Supabase: ${url.replace(/:[^:@]+@/, ':****@')}...`);
      pool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
      });
      client = await pool.connect();
      connectedUrl = url;
      console.log('✅ Berhasil terhubung ke Supabase PostgreSQL!');
      break;
    } catch (err) {
      console.warn(`⚠️ Gagal konek dengan endpoint ini: ${err.message}`);
      if (pool) {
        await pool.end().catch(() => {});
        pool = null;
      }
    }
  }

  if (!client) {
    console.error('❌ Tidak dapat terhubung ke semua endpoint Supabase.');
    process.exit(1);
  }

  try {
    const schemaPath = path.join(__dirname, 'supabase_complete_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('🚀 Menjalankan eksekusi skema database & data awal...');
    await client.query(schemaSql);
    console.log('🎉 SUKSES! SEMUA TABEL, TRIGGER, DAN DATA AWAL TELAH DIBUAT DI SUPABASE!');

    // Update .env with the working URL if different
    if (connectedUrl !== process.env.DATABASE_URL) {
      console.log('ℹ️ Mengupdate .env dengan connection string yang aktif...');
    }
  } catch (error) {
    console.error('❌ Gagal menjalankan query migrasi:', error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}

runMigrateSupabase();
