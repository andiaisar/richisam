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

const updateStatusPermintaan = async (req, res) => {
  const { id_permintaan } = req.params;
  const { status } = req.body;

  // Validasi nilai status yang diizinkan
  const statusDiizinkan = ['Menunggu', 'Diproses', 'Dikirim', 'Selesai'];
  if (!status || !statusDiizinkan.includes(status)) {
    return res.status(400).json({
      error: `Status tidak valid. Gunakan salah satu: ${statusDiizinkan.join(', ')}`
    });
  }

  try {
    const result = await pool.query(
      `UPDATE permintaan_stok 
       SET status = $1 
       WHERE id_permintaan = $2 
       RETURNING id_permintaan, status, tanggal_minta`,
      [status, id_permintaan]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Permintaan stok tidak ditemukan' });
    }

    res.status(200).json({
      message: `Status permintaan berhasil diperbarui menjadi: ${status}`,
      data: result.rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

module.exports = { ajukanPermintaan, getPermintaan, updateStatusPermintaan };
