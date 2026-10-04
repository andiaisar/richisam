const ExcelJS = require('exceljs');
const pool = require('../config/db');

exports.exportLaporanExcel = async (req, res) => {
  try {
    const { bulan, tahun } = req.query; // Contoh penggunaan: /api/laporan/export?bulan=10&tahun=2023

    // 1. Buat Workbook dan Worksheet baru
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Stok Bulanan');

    // 2. Definisikan Kolom
    worksheet.columns = [
      { header: 'Tanggal', key: 'tanggal', width: 15 },
      { header: 'Nama Cabang', key: 'nama_cabang', width: 25 },
      { header: 'Shift', key: 'shift', width: 15 },
      { header: 'Nama Bahan', key: 'nama_bahan', width: 25 },
      { header: 'Stok Awal (SAW)', key: 'stok_awal', width: 18 },
      { header: 'Masuk (M)', key: 'masuk', width: 15 },
      { header: 'Keluar (K)', key: 'keluar', width: 15 },
      { header: 'Stok Akhir (SAK)', key: 'stok_akhir', width: 18 },
    ];

    // Styling baris Header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // 3. Ambil parameter waktu (default: bulan & tahun saat ini jika tidak ada query params)
    const targetBulan = bulan || new Date().getMonth() + 1;
    const targetTahun = tahun || new Date().getFullYear();

    // 4. Query Database
    // Sesuaikan nama tabel (`mutasi_stok`, `cabang`, `bahan_baku`) dengan skema aslinya.
    const query = `
      SELECT 
        TO_CHAR(m.tanggal, 'YYYY-MM-DD') as tanggal,
        c.nama_cabang,
        m.shift,
        b.nama_bahan,
        m.stok_awal,
        m.jumlah_masuk as masuk,
        m.jumlah_keluar as keluar,
        m.stok_akhir
      FROM mutasi_stok m
      JOIN cabang c ON m.cabang_id = c.id
      JOIN bahan_baku b ON m.bahan_id = b.id
      WHERE EXTRACT(MONTH FROM m.tanggal) = $1 
        AND EXTRACT(YEAR FROM m.tanggal) = $2
      ORDER BY m.tanggal ASC, c.nama_cabang ASC;
    `;
    
    const { rows } = await pool.query(query, [targetBulan, targetTahun]);

    // 5. Tambahkan Data ke Worksheet
    rows.forEach(row => {
      worksheet.addRow({
        tanggal: row.tanggal,
        nama_cabang: row.nama_cabang,
        shift: row.shift,
        nama_bahan: row.nama_bahan,
        stok_awal: row.stok_awal,
        masuk: row.masuk,
        keluar: row.keluar,
        stok_akhir: row.stok_akhir
      });
    });

    // 6. Nama File Dinamis
    // Mengubah angka bulan menjadi nama bulan lokal Indonesia
    const namaBulan = new Date(targetTahun, targetBulan - 1).toLocaleString('id-ID', { month: 'long' });
    const fileName = `Laporan_Stok_Bulan_${namaBulan}_${targetTahun}.xlsx`;

    // 7. Konfigurasi Header Response (Force Download)
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );

    // 8. Tulis workbook ke stream dan kirim response
    await workbook.xlsx.write(res);
    res.status(200).end();

  } catch (error) {
    console.error('Error saat ekspor Excel:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Gagal mengekspor laporan Excel' });
    }
  }
};
