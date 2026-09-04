const pool = require('../config/db');

// GET semua stok inventaris per cabang
const getAllStokCabang = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        si.id_stok,
        si.id_cabang,
        c.nama_cabang,
        si.id_bahan,
        b.nama_bahan,
        b.sku,
        s.nama_satuan,
        si.jumlah_sekarang,
        si.stok_minimum,
        si.last_updated,
        CASE 
          WHEN si.jumlah_sekarang < si.stok_minimum THEN true 
          ELSE false 
        END AS is_stok_rendah
      FROM stok_inventaris si
      JOIN cabang c ON si.id_cabang = c.id_cabang
      JOIN bahan_baku b ON si.id_bahan = b.id_bahan
      JOIN satuan s ON b.id_satuan = s.id_satuan
      ORDER BY si.id_cabang, b.nama_bahan ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal mengambil data stok inventaris' });
  }
};

// GET stok inventaris berdasarkan cabang tertentu
const getStokByCabang = async (req, res) => {
  const { id_cabang } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        si.id_stok,
        si.id_bahan,
        b.nama_bahan,
        b.sku,
        s.nama_satuan,
        si.jumlah_sekarang,
        si.stok_minimum,
        si.last_updated,
        CASE 
          WHEN si.jumlah_sekarang < si.stok_minimum THEN true 
          ELSE false 
        END AS is_stok_rendah
      FROM stok_inventaris si
      JOIN bahan_baku b ON si.id_bahan = b.id_bahan
      JOIN satuan s ON b.id_satuan = s.id_satuan
      WHERE si.id_cabang = $1
      ORDER BY b.nama_bahan ASC
    `, [id_cabang]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal mengambil data stok cabang' });
  }
};

// PUT update stok_minimum
const updateStokMinimum = async (req, res) => {
  const { id_cabang, id_bahan } = req.params;
  const { stok_minimum } = req.body;

  if (stok_minimum === undefined || stok_minimum < 0) {
    return res.status(400).json({ error: 'stok_minimum harus berupa angka >= 0' });
  }

  try {
    const result = await pool.query(
      `UPDATE stok_inventaris 
       SET stok_minimum = $1 
       WHERE id_cabang = $2 AND id_bahan = $3
       RETURNING *`,
      [stok_minimum, id_cabang, id_bahan]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Data stok tidak ditemukan' });
    }

    res.json({ message: 'Stok minimum berhasil diperbarui', data: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal memperbarui stok minimum' });
  }
};

module.exports = { getAllStokCabang, getStokByCabang, updateStokMinimum };
