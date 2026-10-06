const pool = require('../config/db');
const ExcelJS = require('exceljs');

class ReportService {
  static async getMutationsReport(outlet_id, start_date, end_date) {
    const query = `
      SELECT 
        o.nama AS outlet_name,
        p.nama AS product_name,
        (
          SELECT m_awal.saw 
          FROM stock_mutations m_awal 
          WHERE m_awal.product_id = p.id AND m_awal.outlet_id = o.id 
            AND m_awal.tanggal >= $1 AND m_awal.tanggal <= $2
          ORDER BY m_awal.tanggal ASC, m_awal.shift ASC LIMIT 1
        ) AS saw_awal,
        SUM(m.masuk) AS total_masuk,
        SUM(m.keluar) AS total_keluar,
        (
          SELECT m_akhir.sak 
          FROM stock_mutations m_akhir 
          WHERE m_akhir.product_id = p.id AND m_akhir.outlet_id = o.id 
            AND m_akhir.tanggal >= $1 AND m_akhir.tanggal <= $2
          ORDER BY m_akhir.tanggal DESC, m_akhir.shift DESC LIMIT 1
        ) AS sak_akhir
      FROM products p
      JOIN stock_mutations m ON p.id = m.product_id
      JOIN outlets o ON m.outlet_id = o.id
      WHERE m.tanggal >= $1 AND m.tanggal <= $2
        AND ($3::int IS NULL OR m.outlet_id = $3)
      GROUP BY o.id, o.nama, p.id, p.nama
      ORDER BY o.nama ASC, p.nama ASC;
    `;
    const res = await pool.query(query, [start_date, end_date, outlet_id || null]);
    return res.rows;
  }

  static async getDefectsReport(start_date, end_date) {
    const query = `
      SELECT 
        o.nama AS outlet_name,
        p.nama AS product_name,
        SUM(d.qty) AS total_defect
      FROM defect_reports d
      JOIN products p ON d.product_id = p.id
      JOIN outlets o ON d.outlet_id = o.id
      WHERE d.status = 'DISETUJUI' 
        AND d.created_at::DATE >= $1 AND d.created_at::DATE <= $2
      GROUP BY o.id, o.nama, p.id, p.nama
      ORDER BY o.nama ASC, p.nama ASC;
    `;
    const res = await pool.query(query, [start_date, end_date]);
    return res.rows;
  }

  static async getDashboardStats(outlet_id) {
    let cabangCond = outlet_id ? `AND id = ${parseInt(outlet_id)}` : '';
    const cabangRes = await pool.query(`SELECT COUNT(*) FROM outlets WHERE tipe = 'CABANG' AND is_active = true ${cabangCond}`);
    const produkRes = await pool.query(`SELECT COUNT(*) FROM products WHERE is_active = true`);
    
    let parCond = outlet_id ? `AND s.outlet_id = ${parseInt(outlet_id)}` : '';
    const parRes = await pool.query(`
      SELECT COUNT(*) FROM stocks s
      JOIN par_stocks ps ON s.product_id = ps.product_id AND s.outlet_id = ps.outlet_id
      WHERE s.qty_current <= ps.min_qty ${parCond}
    `);

    let defCond = outlet_id ? `AND outlet_id = ${parseInt(outlet_id)}` : '';
    const defectRes = await pool.query(`
      SELECT COALESCE(SUM(qty), 0) as total FROM defect_reports
      WHERE status = 'DISETUJUI' 
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      ${defCond}
    `);

    return {
      total_cabang: parseInt(cabangRes.rows[0].count),
      total_produk: parseInt(produkRes.rows[0].count),
      total_stok_menipis: parseInt(parRes.rows[0].count),
      total_defect_bulan_ini: parseInt(defectRes.rows[0].total)
    };
  }

  static async exportMutationsExcel(outlet_id, start_date, end_date) {
    const data = await this.getMutationsReport(outlet_id, start_date, end_date);
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Inventaris Richisam';
    const worksheet = workbook.addWorksheet('Laporan Mutasi');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Cabang', key: 'outlet_name', width: 25 },
      { header: 'Produk', key: 'product_name', width: 30 },
      { header: 'SAW (Stok Awal)', key: 'saw_awal', width: 15 },
      { header: 'Total Masuk', key: 'total_masuk', width: 15 },
      { header: 'Total Keluar', key: 'total_keluar', width: 15 },
      { header: 'SAK (Stok Akhir)', key: 'sak_akhir', width: 15 },
    ];

    data.forEach((row, index) => {
      worksheet.addRow({
        no: index + 1,
        ...row
      });
    });

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}
module.exports = ReportService;
