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

  static async exportMonthlyExcel(outlet_id, bulan, tahun) {
    const startDate = `${tahun}-${bulan.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(tahun, bulan, 0).getDate();
    const endDate = `${tahun}-${bulan.toString().padStart(2, '0')}-${lastDay}`;
    
    const outletQuery = await pool.query('SELECT nama FROM outlets WHERE id = $1', [outlet_id]);
    const outletName = outletQuery.rows.length > 0 ? outletQuery.rows[0].nama : 'Unknown';

    const products = await pool.query('SELECT id, nama, harga, urutan FROM products WHERE is_active = true ORDER BY urutan ASC');
    const mutations = await pool.query('SELECT * FROM stock_mutations WHERE outlet_id = $1 AND tanggal >= $2 AND tanggal <= $3', [outlet_id, startDate, endDate]);
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Inventaris Richisam';

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    const borderAll = {
      top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
    };

    // Prepare data map for quick access
    const mutMap = {};
    mutations.rows.forEach(m => {
      const day = parseInt(m.tanggal.toISOString().split('T')[0].split('-')[2]);
      if (!mutMap[day]) mutMap[day] = {};
      if (!mutMap[day][m.product_id]) mutMap[day][m.product_id] = {};
      mutMap[day][m.product_id][m.shift] = m;
    });

    for (let day = 1; day <= lastDay; day++) {
      const sheetName = `TANGGAL ${day}`;
      const ws = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }]
      });

      ws.mergeCells('A1:V1');
      ws.getCell('A1').value = `LAPORAN STOK ${outletName} - TANGGAL ${day}/${bulan}/${tahun}`;
      ws.getCell('A1').font = { bold: true, size: 14 };

      // Headers Row 2
      ws.mergeCells('A2:A3'); ws.getCell('A2').value = 'NO';
      ws.mergeCells('B2:B3'); ws.getCell('B2').value = 'NAMA BARANG';
      ws.mergeCells('C2:C3'); ws.getCell('C2').value = 'Harga';
      
      ws.mergeCells('D2:H2'); ws.getCell('D2').value = 'MIDNIGHT';
      ws.mergeCells('I2:M2'); ws.getCell('I2').value = 'PAGI';
      ws.mergeCells('N2:R2'); ws.getCell('N2').value = 'SORE';
      
      ws.mergeCells('S2:S3'); ws.getCell('S2').value = 'TOTAL KELUAR';
      ws.mergeCells('T2:T3'); ws.getCell('T2').value = 'GUDANG';
      ws.mergeCells('U2:U3'); ws.getCell('U2').value = 'OUTLET';
      ws.mergeCells('V2:V3'); ws.getCell('V2').value = 'TOTAL';

      // Headers Row 3
      const shiftsCols = ['SAW', 'M', 'SAK', 'K', 'Total Harga'];
      let colIdx = 4;
      for (let s = 0; s < 3; s++) { // 3 shifts
        shiftsCols.forEach(c => {
          ws.getCell(3, colIdx++).value = c;
        });
      }

      // Format Header
      for (let r = 2; r <= 3; r++) {
        for (let c = 1; c <= 22; c++) {
          const cell = ws.getCell(r, c);
          cell.fill = headerFill;
          cell.border = borderAll;
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }

      ws.getColumn(1).width = 5;
      ws.getColumn(2).width = 30;
      ws.getColumn(3).width = 12;
      for (let i = 4; i <= 22; i++) ws.getColumn(i).width = 10;
      ws.getColumn(8).width = 15; // Total Harga mid
      ws.getColumn(13).width = 15; // Total Harga pagi
      ws.getColumn(18).width = 15; // Total Harga sore
      ws.getColumn(19).width = 15; // Total Keluar

      // Data Rows
      products.rows.forEach((p, idx) => {
        const rowNum = idx + 4;
        const row = ws.getRow(rowNum);
        row.getCell(1).value = idx + 1;
        row.getCell(2).value = p.nama;
        row.getCell(3).value = parseFloat(p.harga);

        const pm = mutMap[day] && mutMap[day][p.id] ? mutMap[day][p.id] : {};
        
        // MIDNIGHT
        if (day === 1) {
          row.getCell(4).value = pm.MIDNIGHT ? parseFloat(pm.MIDNIGHT.saw) : 0;
        } else {
          row.getCell(4).value = { formula: `'TANGGAL ${day-1}'!P${rowNum}` };
        }
        row.getCell(5).value = pm.MIDNIGHT ? parseFloat(pm.MIDNIGHT.masuk) : 0;
        row.getCell(6).value = pm.MIDNIGHT ? parseFloat(pm.MIDNIGHT.sak) : 0;
        row.getCell(7).value = { formula: `D${rowNum}+E${rowNum}-F${rowNum}` };
        row.getCell(8).value = { formula: `F${rowNum}*C${rowNum}` };

        // PAGI
        row.getCell(9).value = { formula: `F${rowNum}` };
        row.getCell(10).value = pm.PAGI ? parseFloat(pm.PAGI.masuk) : 0;
        row.getCell(11).value = pm.PAGI ? parseFloat(pm.PAGI.sak) : 0;
        row.getCell(12).value = { formula: `I${rowNum}+J${rowNum}-K${rowNum}` };
        row.getCell(13).value = { formula: `K${rowNum}*C${rowNum}` };

        // SORE
        row.getCell(14).value = { formula: `K${rowNum}` };
        row.getCell(15).value = pm.SORE ? parseFloat(pm.SORE.masuk) : 0;
        row.getCell(16).value = pm.SORE ? parseFloat(pm.SORE.sak) : 0;
        row.getCell(17).value = { formula: `N${rowNum}+O${rowNum}-P${rowNum}` };
        row.getCell(18).value = { formula: `P${rowNum}*C${rowNum}` };

        // TOTALS
        row.getCell(19).value = { formula: `G${rowNum}+L${rowNum}+Q${rowNum}` };
        row.getCell(20).value = { formula: `P${rowNum}` }; // Gudang = SAK SORE
        row.getCell(21).value = 0; // Outlet
        row.getCell(22).value = { formula: `T${rowNum}+U${rowNum}` };

        for (let c = 1; c <= 22; c++) {
          row.getCell(c).border = borderAll;
          if (c >= 3) row.getCell(c).numFmt = '#,##0';
        }
      });
      
      const legRow = products.rows.length + 5;
      ws.getCell(`A${legRow}`).value = 'Keterangan: SAW (Stok Awal), M (Masuk), SAK (Stok Akhir Fisik), K (Keluar / Pemakaian)';
    }

    // Sheet REKAP BULANAN
    const wsRekap = workbook.addWorksheet('REKAP BULANAN');
    wsRekap.mergeCells('A1:G1');
    wsRekap.getCell('A1').value = `REKAP BULANAN STOK ${outletName} - ${bulan}/${tahun}`;
    wsRekap.getCell('A1').font = { bold: true, size: 14 };

    const rekapHeaders = ['NO', 'NAMA BARANG', 'TOTAL MASUK', 'TOTAL KELUAR', 'SAK AKHIR BULAN', 'NILAI PERSEDIAAN', 'RATA-RATA KELUAR/HARI'];
    wsRekap.getRow(3).values = rekapHeaders;
    wsRekap.getRow(3).font = { bold: true };
    for (let c = 1; c <= 7; c++) {
      wsRekap.getCell(3, c).fill = headerFill;
      wsRekap.getCell(3, c).border = borderAll;
    }

    products.rows.forEach((p, idx) => {
      const rowNum = idx + 4;
      const row = wsRekap.getRow(rowNum);
      row.getCell(1).value = idx + 1;
      row.getCell(2).value = p.nama;
      
      let sumM = 0;
      let sumK = 0;
      let lastSak = 0;
      let lastPrice = parseFloat(p.harga);
      
      // Calculate totals from mutations
      for (let day = 1; day <= lastDay; day++) {
        const pm = mutMap[day] && mutMap[day][p.id];
        if (pm) {
          if (pm.MIDNIGHT) { sumM += parseFloat(pm.MIDNIGHT.masuk); sumK += parseFloat(pm.MIDNIGHT.keluar); lastSak = parseFloat(pm.MIDNIGHT.sak); lastPrice = parseFloat(pm.MIDNIGHT.harga_snapshot); }
          if (pm.PAGI) { sumM += parseFloat(pm.PAGI.masuk); sumK += parseFloat(pm.PAGI.keluar); lastSak = parseFloat(pm.PAGI.sak); lastPrice = parseFloat(pm.PAGI.harga_snapshot); }
          if (pm.SORE) { sumM += parseFloat(pm.SORE.masuk); sumK += parseFloat(pm.SORE.keluar); lastSak = parseFloat(pm.SORE.sak); lastPrice = parseFloat(pm.SORE.harga_snapshot); }
        }
      }

      row.getCell(3).value = sumM;
      row.getCell(4).value = sumK;
      row.getCell(5).value = lastSak;
      row.getCell(6).value = lastSak * lastPrice;
      row.getCell(7).value = sumK / lastDay;

      for (let c = 1; c <= 7; c++) {
        row.getCell(c).border = borderAll;
        if (c >= 3) row.getCell(c).numFmt = '#,##0.00';
      }
    });
    
    wsRekap.getColumn(2).width = 30;
    for (let c = 3; c <= 7; c++) wsRekap.getColumn(c).width = 20;

    // Sheet STOK OPNAME
    const opnames = await pool.query('SELECT * FROM stock_opnames WHERE outlet_id = $1 AND tanggal >= $2 AND tanggal <= $3 AND status = $4 ORDER BY tanggal DESC LIMIT 1', [outlet_id, startDate, endDate, 'FINAL']);
    const wsOpname = workbook.addWorksheet('STOK OPNAME');
    
    wsOpname.mergeCells('A1:G1');
    wsOpname.getCell('A1').value = opnames.rows.length > 0 
      ? `STOK OPNAME ${outletName} - TANGGAL ${opnames.rows[0].tanggal.toISOString().split('T')[0]}`
      : `STOK OPNAME ${outletName} - BELUM ADA OPNAME FINAL BULAN INI`;
    wsOpname.getCell('A1').font = { bold: true, size: 14 };

    const opnHdrs = ['NO', 'NAMA BARANG', 'SISTEM', 'FISIK', 'SELISIH', 'HARGA', 'NILAI SELISIH'];
    wsOpname.getRow(3).values = opnHdrs;
    wsOpname.getRow(3).font = { bold: true };
    for (let c = 1; c <= 7; c++) {
      wsOpname.getCell(3, c).fill = headerFill;
      wsOpname.getCell(3, c).border = borderAll;
    }

    if (opnames.rows.length > 0) {
      const items = await pool.query('SELECT * FROM stock_opname_items WHERE opname_id = $1', [opnames.rows[0].id]);
      const itemMap = {};
      items.rows.forEach(i => itemMap[i.product_id] = i);

      products.rows.forEach((p, idx) => {
        const rowNum = idx + 4;
        const row = wsOpname.getRow(rowNum);
        row.getCell(1).value = idx + 1;
        row.getCell(2).value = p.nama;
        const it = itemMap[p.id];
        
        row.getCell(3).value = it ? parseFloat(it.qty_sistem) : 0;
        row.getCell(4).value = it && it.qty_fisik !== null ? parseFloat(it.qty_fisik) : 0;
        row.getCell(5).value = { formula: `D${rowNum}-C${rowNum}` };
        row.getCell(6).value = it ? parseFloat(it.harga_snapshot) : parseFloat(p.harga);
        row.getCell(7).value = { formula: `E${rowNum}*F${rowNum}` };

        for (let c = 1; c <= 7; c++) {
          row.getCell(c).border = borderAll;
          if (c >= 3) row.getCell(c).numFmt = '#,##0';
        }
      });
    }
    
    wsOpname.getColumn(2).width = 30;
    for (let c = 3; c <= 7; c++) wsOpname.getColumn(c).width = 15;

    return await workbook.xlsx.writeBuffer();
  }
}
module.exports = ReportService;
