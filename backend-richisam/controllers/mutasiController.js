const pool = require('../config/db');

const catatMutasi = async (req, res) => {
  // Validasi: pastikan body dikirim dan tidak kosong
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Request body kosong. Kirim data JSON dengan Content-Type: application/json' });
  }

  const { id_bahan, jenis_mutasi, jumlah, keterangan } = req.body;

  // Identitas diambil dari TOKEN, bukan dari body (tidak bisa dipalsukan)
  const id_user = req.user.id_user;
  // Superadmin boleh memilih cabang lewat body; role lain selalu cabangnya sendiri
  const id_cabang = req.user.role === 'Superadmin' ? req.body.id_cabang : req.user.id_cabang;

  // Validasi: pastikan semua field wajib tersedia
  if (!id_cabang || !id_bahan || !jenis_mutasi || !jumlah) {
    return res.status(400).json({ error: 'Field wajib tidak lengkap: id_cabang, id_bahan, jenis_mutasi, jumlah' });
  }
  
  // Gunakan SATU koneksi khusus agar BEGIN, query, dan COMMIT/ROLLBACK
  // berjalan di sesi database yang sama (pool.query bisa memakai koneksi berbeda).
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); 
    
    // 1. Simpan ke riwayat mutasi
    await client.query(
      `INSERT INTO riwayat_mutasi (id_cabang, id_bahan, jenis_mutasi, jumlah, keterangan, id_user) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id_cabang, id_bahan, jenis_mutasi, jumlah, keterangan, id_user]
    );

    // 2. Sesuaikan stok di inventaris
    const operator = jenis_mutasi === 'Masuk' ? '+' : '-';
    const update = await client.query(
      `UPDATE stok_inventaris 
       SET jumlah_sekarang = jumlah_sekarang ${operator} $1, last_updated = CURRENT_TIMESTAMP
       WHERE id_cabang = $2 AND id_bahan = $3`,
      [jumlah, id_cabang, id_bahan]
    );

    // Jika baris stok tidak ada, batalkan juga pencatatan riwayat di langkah 1
    if (update.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Data stok untuk cabang dan bahan tersebut tidak ditemukan' });
    }

    await client.query('COMMIT'); 
    res.json({ message: `Mutasi stok ${jenis_mutasi} berhasil dicatat!` });
  } catch (err) {
    await client.query('ROLLBACK'); 
    console.error(err.message);
    res.status(500).json({ error: 'Gagal mencatat mutasi stok' });
  } finally {
    client.release(); // Kembalikan koneksi ke pool
  }
};

const getRiwayatMutasi = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id_mutasi, 
        c.nama_cabang, 
        b.nama_bahan, 
        r.jenis_mutasi, 
        r.jumlah, 
        r.keterangan, 
        r.tanggal_waktu
      FROM riwayat_mutasi r
      JOIN cabang c ON r.id_cabang = c.id_cabang
      JOIN bahan_baku b ON r.id_bahan = b.id_bahan
      ORDER BY r.tanggal_waktu DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal mengambil riwayat mutasi' });
  }
};

module.exports = { catatMutasi, getRiwayatMutasi };
