const pool = require('../config/db');

const getAllBahan = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.id_bahan, b.nama_bahan, b.sku, k.nama_kategori, s.nama_satuan, b.batas_minimum
      FROM bahan_baku b
      JOIN kategori_bahan k ON b.id_kategori = k.id_kategori
      JOIN satuan s ON b.id_satuan = s.id_satuan
      ORDER BY b.nama_bahan ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal mengambil data bahan baku' });
  }
};

module.exports = { getAllBahan };
