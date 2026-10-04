const pool = require('../config/db');

exports.laporkanDefect = async (req, res) => {
  try {
    const { cabang_id, bahan_id, jumlah_rusak, keterangan } = req.body;
    
    // Validasi apakah foto bukti diunggah
    if (!req.file) {
      return res.status(400).json({ message: 'Foto bukti wajib diunggah (maksimal 2MB, jpg/jpeg/png).' });
    }

    // Ambil path relatif file untuk disimpan ke database
    // Contoh: /uploads/defects/defect-1678901234-567.jpg
    const foto_bukti = `/uploads/defects/${req.file.filename}`;

    const query = `
      INSERT INTO defect_reports (cabang_id, bahan_id, jumlah_rusak, foto_bukti, keterangan)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    
    const values = [cabang_id, bahan_id, jumlah_rusak, foto_bukti, keterangan];
    
    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Laporan defect berhasil disimpan',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error saat menyimpan laporan defect:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};
