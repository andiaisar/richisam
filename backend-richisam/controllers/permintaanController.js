const pool = require('../config/db');

const ajukanPermintaan = async (req, res) => {
  const { id_cabang_pemohon, id_user, detail_barang } = req.body;
  // detail_barang adalah array: [{ id_bahan: 1, jumlah_diminta: 20 }, ...]

  try {
    await pool.query('BEGIN');

    // 1. Buat tiket permohonan
    const permohonan = await pool.query(
      `INSERT INTO permintaan_stok (id_cabang_pemohon, id_user, status) 
       VALUES ($1, $2, 'Menunggu') RETURNING id_permintaan`,
      [id_cabang_pemohon, id_user]
    );
    const id_permintaan = permohonan.rows[0].id_permintaan;

    // 2. Masukkan daftar barang yang diminta
    for (let item of detail_barang) {
      await pool.query(
        `INSERT INTO detail_permintaan (id_permintaan, id_bahan, jumlah_diminta) 
         VALUES ($1, $2, $3)`,
        [id_permintaan, item.id_bahan, item.jumlah_diminta]
      );
    }

    await pool.query('COMMIT');
    res.json({ message: 'Permintaan stok berhasil diajukan', id_permintaan });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Gagal mengajukan permintaan stok' });
  }
};

const getPermintaan = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id_permintaan, c.nama_cabang, p.tanggal_minta, p.status
      FROM permintaan_stok p
      JOIN cabang c ON p.id_cabang_pemohon = c.id_cabang
      ORDER BY p.tanggal_minta DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data permintaan' });
  }
};

// Memperbarui status + otomatis tambah stok cabang jika status 'Selesai'
const updateStatusDanTambahStok = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id_permintaan } = req.params;
    const { status } = req.body;

    // Validasi nilai status yang diizinkan
    const statusDiizinkan = ['Menunggu', 'Diproses', 'Dikirim', 'Selesai'];
    if (!status || !statusDiizinkan.includes(status)) {
      return res.status(400).json({
        error: `Status tidak valid. Gunakan salah satu: ${statusDiizinkan.join(', ')}`
      });
    }

    await client.query('BEGIN');

    // 1. Cek permintaan ada atau tidak
    const cekPermintaan = await client.query(
      `SELECT * FROM permintaan_stok WHERE id_permintaan = $1`,
      [id_permintaan]
    );

    if (cekPermintaan.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Permintaan stok tidak ditemukan' });
    }

    const permintaan = cekPermintaan.rows[0];

    // 2. Update status permintaan
    await client.query(
      `UPDATE permintaan_stok SET status = $1 WHERE id_permintaan = $2`,
      [status, id_permintaan]
    );

    // 3. Jika status 'Selesai', otomatis tambahkan stok ke stok_inventaris cabang
    if (status === 'Selesai') {
      const detailPermintaan = await client.query(
        `SELECT id_bahan, jumlah_diminta FROM detail_permintaan WHERE id_permintaan = $1`,
        [id_permintaan]
      );

      for (const item of detailPermintaan.rows) {
        // Cek apakah bahan sudah ada di stok_inventaris cabang tersebut
        const cekStok = await client.query(
          `SELECT * FROM stok_inventaris WHERE id_cabang = $1 AND id_bahan = $2`,
          [permintaan.id_cabang_pemohon, item.id_bahan]
        );

        if (cekStok.rows.length > 0) {
          // Tambahkan ke jumlah_sekarang yang sudah ada
          await client.query(
            `UPDATE stok_inventaris 
             SET jumlah_sekarang = jumlah_sekarang + $1, last_updated = CURRENT_TIMESTAMP
             WHERE id_cabang = $2 AND id_bahan = $3`,
            [item.jumlah_diminta, permintaan.id_cabang_pemohon, item.id_bahan]
          );
        } else {
          // Buat record baru jika belum ada
          await client.query(
            `INSERT INTO stok_inventaris (id_cabang, id_bahan, jumlah_sekarang, stok_minimum)
             VALUES ($1, $2, $3, 0)`,
            [permintaan.id_cabang_pemohon, item.id_bahan, item.jumlah_diminta]
          );
        }
      }
    }

    await client.query('COMMIT');

    res.status(200).json({
      message: `Status berhasil diubah ke '${status}'${
        status === 'Selesai' ? ' dan stok cabang diperbarui otomatis!' : '!'
      }`
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Terjadi kesalahan pada server saat memproses transaksi' });
  } finally {
    client.release(); // Kembalikan koneksi ke pool
  }
};

module.exports = { ajukanPermintaan, getPermintaan, updateStatusDanTambahStok };
