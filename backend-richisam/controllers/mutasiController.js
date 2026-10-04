const pool = require('../config/db');

const catatMutasi = async (req, res) => {
  // Validasi: pastikan body dikirim dan tidak kosong
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Request body kosong. Kirim data JSON dengan Content-Type: application/json' });
  }

  // Ambil nilai dari request (masuk dan keluar default ke 0 jika tidak diisi)
  const { id_bahan, shift, masuk = 0, keluar = 0, keterangan } = req.body;

  // Identitas diambil dari TOKEN
  const id_user = req.user.id_user;
  const id_cabang = req.user.role === 'Superadmin' ? req.body.id_cabang : req.user.id_cabang;

  // 1. VALIDASI INPUT (Shift & Field Wajib)
  if (!id_cabang || !id_bahan || !shift) {
    return res.status(400).json({ error: 'Field wajib tidak lengkap: id_cabang, id_bahan, shift' });
  }

  // Validasi tipe shift agar meminimalisir human error
  const allowedShifts = ['Midnight', 'Pagi', 'Sore'];
  if (!allowedShifts.includes(shift)) {
    return res.status(400).json({ 
      error: `Shift tidak valid. Harap pilih salah satu dari: ${allowedShifts.join(', ')}` 
    });
  }

  // Pastikan input masuk dan keluar adalah angka yang valid dan tidak negatif
  if (isNaN(masuk) || isNaN(keluar) || masuk < 0 || keluar < 0) {
    return res.status(400).json({ error: 'Nilai masuk dan keluar harus berupa angka yang tidak negatif' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN'); 

    // 2. AMBIL STOK AWAL (SAW)
    // Gunakan 'FOR UPDATE' untuk mengunci baris agar mencegah race condition jika ada request bersamaan
    const cekStok = await client.query(
      `SELECT jumlah_sekarang FROM stok_inventaris WHERE id_cabang = $1 AND id_bahan = $2 FOR UPDATE`,
      [id_cabang, id_bahan]
    );

    if (cekStok.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Data stok untuk cabang dan bahan tersebut tidak ditemukan' });
    }

    const stok_awal = cekStok.rows[0].jumlah_sekarang;

    // 3. LOGIKA RUMUS STOK AKHIR (SAK = SAW + Masuk - Keluar)
    const stok_akhir = stok_awal + Number(masuk) - Number(keluar);

    if (stok_akhir < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Stok akhir tidak boleh kurang dari 0 (Keluar lebih besar dari stok tersedia)' });
    }
    
    // 4. SIMPAN KE RIWAYAT MUTASI (Schema baru)
    await client.query(
      `INSERT INTO riwayat_mutasi 
       (id_cabang, id_bahan, shift, stok_awal, jumlah_masuk, jumlah_keluar, stok_akhir, keterangan, id_user) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id_cabang, id_bahan, shift, stok_awal, masuk, keluar, stok_akhir, keterangan, id_user]
    );

    // 5. UPDATE STOK TERKINI DI INVENTARIS
    await client.query(
      `UPDATE stok_inventaris 
       SET jumlah_sekarang = $1, last_updated = CURRENT_TIMESTAMP
       WHERE id_cabang = $2 AND id_bahan = $3`,
      [stok_akhir, id_cabang, id_bahan]
    );

    await client.query('COMMIT'); 
    res.json({ 
      message: 'Mutasi stok berhasil dicatat!',
      data: { shift, stok_awal, masuk, keluar, stok_akhir }
    });
  } catch (err) {
    await client.query('ROLLBACK'); 
    console.error(err.message);
    res.status(500).json({ error: 'Gagal mencatat mutasi stok' });
  } finally {
    client.release();
  }
};

const getRiwayatMutasi = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id_mutasi, 
        c.nama_cabang, 
        b.nama_bahan, 
        r.shift,
        r.stok_awal,
        r.jumlah_masuk,
        r.jumlah_keluar,
        r.stok_akhir,
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
