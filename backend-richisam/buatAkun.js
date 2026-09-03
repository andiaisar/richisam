const bcrypt = require('bcrypt');
const pool = require('./config/db');

async function buatAdmin() {
  try {
    // Mengacak sandi "password123" sebelum dimasukkan ke database
    const passwordHash = await bcrypt.hash('password123', 10);
    
    await pool.query(
      `INSERT INTO users (nama_lengkap, role, username, password, id_cabang) 
       VALUES ('Admin Pusat', 'Superadmin', 'admin', $1, 1)`,
      [passwordHash]  // ← parameter $1 dikirim di sini
    );
    console.log('✅ Akun admin berhasil disuntikkan ke database!');
  } catch (err) {
    console.error('Gagal:', err.message);
  } finally {
    process.exit();
  }
}

buatAdmin();
