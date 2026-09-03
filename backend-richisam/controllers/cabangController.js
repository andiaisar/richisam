const pool = require('../config/db');

const getAllCabang = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cabang ORDER BY id_cabang ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Terjadi kesalahan server saat mengambil cabang' });
  }
};

const getStokKritis = async (req, res) => {
  try {
    const queryKritis = `
      SELECT c.nama_cabang, b.nama_bahan, s.jumlah_sekarang, b.batas_minimum
      FROM stok_inventaris s
      JOIN cabang c ON s.id_cabang = c.id_cabang
      JOIN bahan_baku b ON s.id_bahan = b.id_bahan
      WHERE s.jumlah_sekarang < b.batas_minimum;
    `;
    const result = await pool.query(queryKritis);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal mengambil data stok kritis' });
  }
};

module.exports = { getAllCabang, getStokKritis };
