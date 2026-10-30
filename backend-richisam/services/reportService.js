const pool = require('../config/db');
const ExcelJS = require('exceljs');
const OpnameService = require('./opnameService');

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

    let assetCond = outlet_id ? `WHERE outlet_id = ${parseInt(outlet_id)}` : '';
    const assetRes = await pool.query(`
      SELECT 
        COALESCE(SUM(qty_baik + qty_rusak), 0) as total_unit,
        COALESCE(SUM(qty_baik), 0) as total_baik,
        COALESCE(SUM(qty_rusak), 0) as total_rusak,
        COUNT(DISTINCT asset_id) FILTER (WHERE (qty_baik + qty_rusak) > 0) as total_jenis_terdata
      FROM asset_stocks
      ${assetCond}
    `);
    const assetRow = assetRes.rows[0] || {};

    let stockValCond = outlet_id ? `AND s.outlet_id = ${parseInt(outlet_id)}` : '';
    const stockValRes = await pool.query(`
      SELECT 
        COALESCE(SUM(s.qty_current * COALESCE(p.harga, 0)), 0) as total_nilai_persediaan,
        COALESCE(SUM(s.qty_current), 0) as total_unit_stok
      FROM stocks s
      JOIN products p ON s.product_id = p.id
      WHERE p.is_active = true ${stockValCond}
    `);
    const stockValRow = stockValRes.rows[0] || {};

    let mutMonthCond = outlet_id ? `AND m.outlet_id = ${parseInt(outlet_id)}` : '';
    const mutMonthRes = await pool.query(`
      SELECT 
        COALESCE(SUM(m.masuk), 0) as total_masuk_bulan_ini,
        COALESCE(SUM(m.keluar), 0) as total_keluar_bulan_ini,
        COALESCE(SUM(m.keluar * COALESCE(m.harga_snapshot, p.harga, 0)), 0) as nilai_pemakaian_bulan_ini
      FROM stock_mutations m
      JOIN products p ON m.product_id = p.id
      WHERE EXTRACT(MONTH FROM m.tanggal) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM m.tanggal) = EXTRACT(YEAR FROM CURRENT_DATE)
        ${mutMonthCond}
    `);
    const mutMonthRow = mutMonthRes.rows[0] || {};

    let reqSummaryRow = {};
    try {
      let reqCond = outlet_id ? `WHERE outlet_id = ${parseInt(outlet_id)}` : '';
      const reqSummaryRes = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status IN ('DIAJUKAN', 'DIPROSES', 'DIKIRIM')) as total_aktif,
          COUNT(*) FILTER (WHERE status = 'DIAJUKAN') as total_diajukan,
          COUNT(*) FILTER (WHERE status = 'DIPROSES') as total_diproses,
          COUNT(*) FILTER (WHERE status = 'DIKIRIM') as total_dikirim,
          COUNT(*) FILTER (
            WHERE status = 'SELESAI'
            AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
          ) as total_selesai_bulan_ini
        FROM restock_tickets
        ${reqCond}
      `);
      reqSummaryRow = reqSummaryRes.rows[0] || {};
    } catch (_) {}

    let opnameSummaryRow = {};
    try {
      let opnCond = outlet_id ? `WHERE outlet_id = ${parseInt(outlet_id)}` : '';
      let shiftCond = outlet_id ? `AND sc.outlet_id = ${parseInt(outlet_id)}` : '';
      const opnameSummaryRes = await pool.query(`
        SELECT 
          COUNT(*) FILTER (
            WHERE status = 'FINAL'
            AND EXTRACT(MONTH FROM tanggal) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM tanggal) = EXTRACT(YEAR FROM CURRENT_DATE)
          ) as total_final_bulan_ini,
          COUNT(*) FILTER (WHERE status = 'DRAFT') as total_draft_aktif,
          (
            SELECT COUNT(*) FROM shift_closings sc
            WHERE sc.shift_date = CURRENT_DATE AND sc.status = 'CLOSED'
            ${shiftCond}
          ) as shift_closed_hari_ini
        FROM stock_opnames
        ${opnCond}
      `);
      opnameSummaryRow = opnameSummaryRes.rows[0] || {};
    } catch (_) {}

    const branchPerfRes = await pool.query(`
      SELECT 
        o.id,
        o.nama,
        o.tipe,
        COALESCE((
          SELECT SUM(s.qty_current * COALESCE(p.harga, 0))
          FROM stocks s
          JOIN products p ON s.product_id = p.id
          WHERE s.outlet_id = o.id AND p.is_active = true
        ), 0) as nilai_stok,
        COALESCE((
          SELECT COUNT(*)
          FROM stocks s
          JOIN par_stocks ps ON s.product_id = ps.product_id AND s.outlet_id = ps.outlet_id
          WHERE s.outlet_id = o.id AND s.qty_current <= ps.min_qty
        ), 0) as stok_kritis,
        COALESCE((
          SELECT SUM(m.masuk)
          FROM stock_mutations m
          WHERE m.outlet_id = o.id
            AND EXTRACT(MONTH FROM m.tanggal) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM m.tanggal) = EXTRACT(YEAR FROM CURRENT_DATE)
        ), 0) as masuk_bulan_ini,
        COALESCE((
          SELECT SUM(m.keluar)
          FROM stock_mutations m
          WHERE m.outlet_id = o.id
            AND EXTRACT(MONTH FROM m.tanggal) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM m.tanggal) = EXTRACT(YEAR FROM CURRENT_DATE)
        ), 0) as keluar_bulan_ini,
        COALESCE((
          SELECT SUM(m.keluar * COALESCE(m.harga_snapshot, p.harga, 0))
          FROM stock_mutations m
          JOIN products p ON m.product_id = p.id
          WHERE m.outlet_id = o.id
            AND EXTRACT(MONTH FROM m.tanggal) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM m.tanggal) = EXTRACT(YEAR FROM CURRENT_DATE)
        ), 0) as nilai_keluar_bulan_ini,
        COALESCE((
          SELECT SUM(d.qty)
          FROM defect_reports d
          WHERE d.outlet_id = o.id AND d.status = 'DISETUJUI'
            AND EXTRACT(MONTH FROM d.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM d.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        ), 0) as defect_bulan_ini
      FROM outlets o
      WHERE o.is_active = true
      ORDER BY o.tipe DESC, o.id ASC
    `);
    const branchPerfRows = (branchPerfRes?.rows || []).map(r => ({
      id: r.id,
      nama: r.nama,
      tipe: r.tipe,
      nilai_stok: parseFloat(r.nilai_stok || 0),
      stok_kritis: parseInt(r.stok_kritis || 0),
      masuk_bulan_ini: parseInt(r.masuk_bulan_ini || 0),
      keluar_bulan_ini: parseInt(r.keluar_bulan_ini || 0),
      nilai_keluar_bulan_ini: parseFloat(r.nilai_keluar_bulan_ini || 0),
      defect_bulan_ini: parseInt(r.defect_bulan_ini || 0)
    }));

    return {
      total_cabang: parseInt(cabangRes.rows[0].count),
      total_produk: parseInt(produkRes.rows[0].count),
      total_stok_menipis: parseInt(parRes.rows[0].count),
      total_defect_bulan_ini: parseInt(defectRes.rows[0].total),
      total_nilai_persediaan: parseFloat(stockValRow.total_nilai_persediaan || 0),
      total_unit_stok: parseInt(stockValRow.total_unit_stok || 0),
      total_masuk_bulan_ini: parseInt(mutMonthRow.total_masuk_bulan_ini || 0),
      total_keluar_bulan_ini: parseInt(mutMonthRow.total_keluar_bulan_ini || 0),
      nilai_pemakaian_bulan_ini: parseFloat(mutMonthRow.nilai_pemakaian_bulan_ini || 0),
      branch_performance: branchPerfRows,
      assets: {
        total_unit: parseInt(assetRow.total_unit || 0),
        total_baik: parseInt(assetRow.total_baik || 0),
        total_rusak: parseInt(assetRow.total_rusak || 0),
        total_jenis: parseInt(assetRow.total_jenis_terdata || 0)
      },
      requests_summary: {
        total_aktif: parseInt(reqSummaryRow.total_aktif || 0),
        total_diajukan: parseInt(reqSummaryRow.total_diajukan || 0),
        total_diproses: parseInt(reqSummaryRow.total_diproses || 0),
        total_dikirim: parseInt(reqSummaryRow.total_dikirim || 0),
        total_selesai_bulan_ini: parseInt(reqSummaryRow.total_selesai_bulan_ini || 0)
      },
      opname_summary: {
        total_final_bulan_ini: parseInt(opnameSummaryRow.total_final_bulan_ini || 0),
        total_draft_aktif: parseInt(opnameSummaryRow.total_draft_aktif || 0),
        shift_closed_hari_ini: parseInt(opnameSummaryRow.shift_closed_hari_ini || 0)
      }
    };
  }

  static async getMonthlyRecap(outlet_id, bulan, tahun) {
    await OpnameService.syncOpnameSnapshots();
    try {
      await pool.query(
        `UPDATE stock_mutations m
         SET harga_snapshot = p.harga
         FROM products p
         WHERE m.product_id = p.id
           AND m.harga_snapshot IS DISTINCT FROM p.harga`
      );
    } catch (_) {}

    const startDate = `${tahun}-${bulan.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(tahun, bulan, 0).getDate();
    const endDate = `${tahun}-${bulan.toString().padStart(2, '0')}-${lastDay}`;

    const outletFilter = outlet_id ? `AND m.outlet_id = $3` : '';
    const params = outlet_id ? [startDate, endDate, parseInt(outlet_id)] : [startDate, endDate];

    // 1. Rekap Per Barang (Bulanan)
    const itemsQuery = `
      SELECT 
        p.id,
        p.kode,
        p.nama,
        p.kategori,
        p.satuan,
        COALESCE(p.harga, 0) as harga_master,
        COALESCE((
          SELECT m_awal.saw
          FROM stock_mutations m_awal
          WHERE m_awal.product_id = p.id
            AND m_awal.tanggal >= $1 AND m_awal.tanggal <= $2
            ${outlet_id ? 'AND m_awal.outlet_id = $3' : ''}
          ORDER BY m_awal.tanggal ASC, 
                   (CASE m_awal.shift WHEN 'MIDNIGHT' THEN 1 WHEN 'PAGI' THEN 2 WHEN 'SORE' THEN 3 ELSE 4 END) ASC,
                   m_awal.id ASC
          LIMIT 1
        ), COALESCE((
          SELECT SUM(s.qty_current)
          FROM stocks s
          WHERE s.product_id = p.id
            ${outlet_id ? 'AND s.outlet_id = $3' : ''}
        ), 0)) as saw_awal_bulan,
        COALESCE(SUM(m.masuk), 0) as total_masuk,
        COALESCE(SUM(m.keluar), 0) as total_keluar,
        COALESCE((
          SELECT m_akhir.sak
          FROM stock_mutations m_akhir
          WHERE m_akhir.product_id = p.id
            AND m_akhir.tanggal >= $1 AND m_akhir.tanggal <= $2
            ${outlet_id ? 'AND m_akhir.outlet_id = $3' : ''}
          ORDER BY m_akhir.tanggal DESC, 
                   (CASE m_akhir.shift WHEN 'SORE' THEN 3 WHEN 'PAGI' THEN 2 WHEN 'MIDNIGHT' THEN 1 ELSE 0 END) DESC,
                   m_akhir.id DESC
          LIMIT 1
        ), COALESCE((
          SELECT SUM(s.qty_current)
          FROM stocks s
          WHERE s.product_id = p.id
            ${outlet_id ? 'AND s.outlet_id = $3' : ''}
        ), 0)) as sak_akhir_bulan
      FROM products p
      LEFT JOIN stock_mutations m
        ON p.id = m.product_id
        AND m.tanggal >= $1 AND m.tanggal <= $2
        ${outletFilter}
      WHERE p.is_active = true
      GROUP BY p.id, p.kode, p.nama, p.kategori, p.satuan, p.harga, p.urutan
      ORDER BY p.urutan ASC, p.nama ASC
    `;
    const itemsRes = await pool.query(itemsQuery, params);

    const items = (itemsRes?.rows || []).map(row => {
      const harga = parseFloat(row.harga_master || 0);
      const totalMasuk = parseInt(row.total_masuk || 0);
      const totalKeluar = parseInt(row.total_keluar || 0);
      const sawAwal = parseInt(row.saw_awal_bulan || 0);
      const sakAkhir = parseInt(row.sak_akhir_bulan || 0);
      const nilaiPersediaan = sakAkhir * harga;
      const nilaiPemakaian = totalKeluar * harga;
      const rataRataHarian = Number((totalKeluar / lastDay).toFixed(2));

      return {
        id: row.id,
        kode: row.kode,
        nama: row.nama,
        kategori: row.kategori || 'Bahan Umum',
        satuan: row.satuan || 'Pcs',
        harga,
        saw_awal_bulan: sawAwal,
        total_masuk: totalMasuk,
        total_keluar: totalKeluar,
        rata_rata_harian: rataRataHarian,
        sak_akhir_bulan: sakAkhir,
        nilai_persediaan: nilaiPersediaan,
        nilai_pemakaian: nilaiPemakaian
      };
    });

    // 2. Rekap Per Cabang pada Bulan Terpilih
    const branchRecapRes = await pool.query(`
      SELECT 
        o.id,
        o.nama,
        o.tipe,
        COALESCE(SUM(m.masuk), 0) as total_masuk,
        COALESCE(SUM(m.keluar), 0) as total_keluar,
        COALESCE(SUM(m.keluar * COALESCE(p.harga, m.harga_snapshot, 0)), 0) as nilai_pemakaian,
        COALESCE((
          SELECT SUM(d.qty)
          FROM defect_reports d
          WHERE d.outlet_id = o.id AND d.status = 'DISETUJUI'
            AND d.created_at::DATE >= $1 AND d.created_at::DATE <= $2
        ), 0) as total_defect,
        COALESCE((
          SELECT COUNT(*)
          FROM stock_opnames so
          WHERE so.outlet_id = o.id AND so.status = 'FINAL'
            AND so.tanggal >= $1 AND so.tanggal <= $2
        ), 0) as opname_final_count
      FROM outlets o
      LEFT JOIN stock_mutations m ON o.id = m.outlet_id AND m.tanggal >= $1 AND m.tanggal <= $2
      LEFT JOIN products p ON m.product_id = p.id
      WHERE o.is_active = true
        ${outlet_id ? 'AND o.id = $3' : ''}
      GROUP BY o.id, o.nama, o.tipe
      ORDER BY o.tipe DESC, o.id ASC
    `, params);

    const branches = (branchRecapRes?.rows || []).map(b => ({
      id: b.id,
      nama: b.nama,
      tipe: b.tipe,
      total_masuk: parseInt(b.total_masuk || 0),
      total_keluar: parseInt(b.total_keluar || 0),
      nilai_pemakaian: parseFloat(b.nilai_pemakaian || 0),
      total_defect: parseInt(b.total_defect || 0),
      opname_final_count: parseInt(b.opname_final_count || 0)
    }));

    const summary = {
      bulan,
      tahun,
      jumlah_hari: lastDay,
      total_item: items.length,
      item_aktif_bergerak: items.filter(i => i.total_masuk > 0 || i.total_keluar > 0).length,
      total_unit_masuk: items.reduce((acc, i) => acc + i.total_masuk, 0),
      total_unit_keluar: items.reduce((acc, i) => acc + i.total_keluar, 0),
      total_nilai_pemakaian: items.reduce((acc, i) => acc + i.nilai_pemakaian, 0),
      total_nilai_persediaan: items.reduce((acc, i) => acc + i.nilai_persediaan, 0),
      total_defect_bulan: branches.reduce((acc, b) => acc + b.total_defect, 0)
    };

    return {
      summary,
      branches,
      items
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
    // 1. Sinkronkan snapshot harga & stok opname sebelum ekspor agar seluruh angka akurat
    await OpnameService.syncOpnameSnapshots();
    try {
      await pool.query(
        `UPDATE stock_mutations m
         SET harga_snapshot = p.harga
         FROM products p
         WHERE m.product_id = p.id
           AND m.harga_snapshot IS DISTINCT FROM p.harga`
      );
    } catch (_) {}

    const startDate = `${tahun}-${bulan.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(tahun, bulan, 0).getDate();
    const endDate = `${tahun}-${bulan.toString().padStart(2, '0')}-${lastDay}`;
    
    const outletQuery = await pool.query('SELECT nama FROM outlets WHERE id = $1', [outlet_id]);
    const outletName = outletQuery.rows.length > 0 ? outletQuery.rows[0].nama : 'Unknown';

    const products = await pool.query('SELECT id, nama, satuan, harga, urutan FROM products WHERE is_active = true ORDER BY urutan ASC');
    const stocksRes = await pool.query('SELECT product_id, qty_current FROM stocks WHERE outlet_id = $1', [outlet_id]);
    const stockMap = {};
    (stocksRes.rows || []).forEach(s => {
      stockMap[s.product_id] = parseFloat(s.qty_current || 0);
    });

    const mutations = await pool.query(
      `SELECT * FROM stock_mutations 
       WHERE outlet_id = $1 AND tanggal >= $2 AND tanggal <= $3
       ORDER BY tanggal ASC, 
                (CASE shift WHEN 'MIDNIGHT' THEN 1 WHEN 'PAGI' THEN 2 WHEN 'SORE' THEN 3 ELSE 4 END) ASC,
                id ASC`,
      [outlet_id, startDate, endDate]
    );
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Inventaris Richisam';

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    const borderAll = {
      top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
    };

    // Prepare data map & initial SAW per product
    const mutMap = {};
    const firstSawMap = {};
    const lastSakMap = {};
    mutations.rows.forEach(m => {
      const dateStr = m.tanggal instanceof Date ? m.tanggal.toISOString().split('T')[0] : String(m.tanggal).split('T')[0];
      const day = parseInt(dateStr.split('-')[2], 10);
      if (!mutMap[day]) mutMap[day] = {};
      if (!mutMap[day][m.product_id]) mutMap[day][m.product_id] = {};
      mutMap[day][m.product_id][m.shift] = m;

      if (firstSawMap[m.product_id] === undefined) {
        firstSawMap[m.product_id] = parseFloat(m.saw || 0);
      }
      lastSakMap[m.product_id] = parseFloat(m.sak || 0);
    });

    // Track running SAK across days so we can also populate precomputed formula results
    const runningSakByProduct = {};
    products.rows.forEach(p => {
      runningSakByProduct[p.id] = firstSawMap[p.id] !== undefined
        ? firstSawMap[p.id]
        : (stockMap[p.id] !== undefined ? stockMap[p.id] : 0);
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
        const hargaSatuan = parseFloat(p.harga || 0);
        row.getCell(1).value = idx + 1;
        row.getCell(2).value = p.nama;
        row.getCell(3).value = hargaSatuan;

        const pm = mutMap[day] && mutMap[day][p.id] ? mutMap[day][p.id] : {};
        
        // MIDNIGHT
        const sawMid = pm.MIDNIGHT ? parseFloat(pm.MIDNIGHT.saw) : runningSakByProduct[p.id];
        const mMid = pm.MIDNIGHT ? parseFloat(pm.MIDNIGHT.masuk) : 0;
        const sakMid = pm.MIDNIGHT ? parseFloat(pm.MIDNIGHT.sak) : (sawMid + mMid);
        const kMid = sawMid + mMid - sakMid;

        if (day === 1) {
          row.getCell(4).value = sawMid;
        } else {
          row.getCell(4).value = { formula: `'TANGGAL ${day-1}'!P${rowNum}`, result: sawMid };
        }
        row.getCell(5).value = mMid;
        row.getCell(6).value = pm.MIDNIGHT ? sakMid : { formula: `D${rowNum}+E${rowNum}`, result: sakMid };
        row.getCell(7).value = { formula: `D${rowNum}+E${rowNum}-F${rowNum}`, result: kMid };
        row.getCell(8).value = { formula: `G${rowNum}*C${rowNum}`, result: kMid * hargaSatuan };

        // PAGI
        const sawPagi = sakMid;
        const mPagi = pm.PAGI ? parseFloat(pm.PAGI.masuk) : 0;
        const sakPagi = pm.PAGI ? parseFloat(pm.PAGI.sak) : (sawPagi + mPagi);
        const kPagi = sawPagi + mPagi - sakPagi;

        row.getCell(9).value = { formula: `F${rowNum}`, result: sawPagi };
        row.getCell(10).value = mPagi;
        row.getCell(11).value = pm.PAGI ? sakPagi : { formula: `I${rowNum}+J${rowNum}`, result: sakPagi };
        row.getCell(12).value = { formula: `I${rowNum}+J${rowNum}-K${rowNum}`, result: kPagi };
        row.getCell(13).value = { formula: `L${rowNum}*C${rowNum}`, result: kPagi * hargaSatuan };

        // SORE
        const sawSore = sakPagi;
        const mSore = pm.SORE ? parseFloat(pm.SORE.masuk) : 0;
        const sakSore = pm.SORE ? parseFloat(pm.SORE.sak) : (sawSore + mSore);
        const kSore = sawSore + mSore - sakSore;

        row.getCell(14).value = { formula: `K${rowNum}`, result: sawSore };
        row.getCell(15).value = mSore;
        row.getCell(16).value = pm.SORE ? sakSore : { formula: `N${rowNum}+O${rowNum}`, result: sakSore };
        row.getCell(17).value = { formula: `N${rowNum}+O${rowNum}-P${rowNum}`, result: kSore };
        row.getCell(18).value = { formula: `Q${rowNum}*C${rowNum}`, result: kSore * hargaSatuan };

        // TOTALS
        const totalKeluarHari = kMid + kPagi + kSore;
        runningSakByProduct[p.id] = sakSore;

        row.getCell(19).value = { formula: `G${rowNum}+L${rowNum}+Q${rowNum}`, result: totalKeluarHari };
        row.getCell(20).value = { formula: `P${rowNum}`, result: sakSore }; // Gudang = SAK SORE
        row.getCell(21).value = 0; // Outlet
        row.getCell(22).value = { formula: `T${rowNum}+U${rowNum}`, result: sakSore };

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
      let lastSak = lastSakMap[p.id] !== undefined
        ? lastSakMap[p.id]
        : (stockMap[p.id] !== undefined ? stockMap[p.id] : 0);
      const masterPrice = parseFloat(p.harga || 0);
      
      // Calculate totals from mutations
      for (let day = 1; day <= lastDay; day++) {
        const pm = mutMap[day] && mutMap[day][p.id];
        if (pm) {
          if (pm.MIDNIGHT) { sumM += parseFloat(pm.MIDNIGHT.masuk); sumK += parseFloat(pm.MIDNIGHT.keluar); lastSak = parseFloat(pm.MIDNIGHT.sak); }
          if (pm.PAGI) { sumM += parseFloat(pm.PAGI.masuk); sumK += parseFloat(pm.PAGI.keluar); lastSak = parseFloat(pm.PAGI.sak); }
          if (pm.SORE) { sumM += parseFloat(pm.SORE.masuk); sumK += parseFloat(pm.SORE.keluar); lastSak = parseFloat(pm.SORE.sak); }
        }
      }

      row.getCell(3).value = sumM;
      row.getCell(4).value = sumK;
      row.getCell(5).value = lastSak;
      row.getCell(6).value = lastSak * masterPrice;
      row.getCell(7).value = Number((sumK / lastDay).toFixed(2));

      for (let c = 1; c <= 7; c++) {
        row.getCell(c).border = borderAll;
        if (c >= 3 && c <= 6) row.getCell(c).numFmt = '#,##0';
        if (c === 7) row.getCell(c).numFmt = '#,##0.00';
      }
    });
    
    wsRekap.getColumn(2).width = 30;
    for (let c = 3; c <= 7; c++) wsRekap.getColumn(c).width = 20;

    // Sheet STOK OPNAME
    // Prioritaskan opname FINAL terbaru pada bulan ini; jika belum ada yang FINAL, gunakan DRAFT terbaru bulan ini
    const opnames = await pool.query(
      `SELECT * FROM stock_opnames 
       WHERE outlet_id = $1 AND tanggal >= $2 AND tanggal <= $3 
       ORDER BY (CASE WHEN status = 'FINAL' THEN 0 ELSE 1 END) ASC, tanggal DESC, id DESC 
       LIMIT 1`,
      [outlet_id, startDate, endDate]
    );
    const wsOpname = workbook.addWorksheet('STOK OPNAME', {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }]
    });
    
    wsOpname.mergeCells('A1:H1');
    if (opnames.rows.length > 0) {
      const opnRow = opnames.rows[0];
      const tglStr = opnRow.tanggal instanceof Date ? opnRow.tanggal.toISOString().split('T')[0] : String(opnRow.tanggal).split('T')[0];
      const statusLabel = opnRow.status === 'FINAL' ? 'FINAL' : 'DRAFT';
      wsOpname.getCell('A1').value = `STOK OPNAME ${outletName} - TANGGAL ${tglStr} (${opnRow.kode} - ${statusLabel})`;
    } else {
      wsOpname.getCell('A1').value = `STOK OPNAME ${outletName} - POSISI STOK BERJALAN (${bulan}/${tahun})`;
    }
    wsOpname.getCell('A1').font = { bold: true, size: 14 };

    const opnHdrs = ['NO', 'NAMA BARANG', 'SISTEM', 'FISIK', 'SELISIH', 'HARGA', 'NILAI SELISIH', 'KETERANGAN / ALASAN'];
    wsOpname.getRow(3).values = opnHdrs;
    wsOpname.getRow(3).font = { bold: true };
    for (let c = 1; c <= 8; c++) {
      wsOpname.getCell(3, c).fill = headerFill;
      wsOpname.getCell(3, c).border = borderAll;
      wsOpname.getCell(3, c).alignment = { horizontal: 'center', vertical: 'middle' };
    }

    let itemMap = {};
    if (opnames.rows.length > 0) {
      const items = await pool.query('SELECT * FROM stock_opname_items WHERE opname_id = $1', [opnames.rows[0].id]);
      items.rows.forEach(i => itemMap[i.product_id] = i);
    }

    let totalSistem = 0;
    let totalFisik = 0;
    let totalSelisih = 0;
    let totalNilaiSelisih = 0;

    products.rows.forEach((p, idx) => {
      const rowNum = idx + 4;
      const row = wsOpname.getRow(rowNum);
      const it = itemMap[p.id];
      const fallbackStock = lastSakMap[p.id] !== undefined
        ? lastSakMap[p.id]
        : (stockMap[p.id] !== undefined ? stockMap[p.id] : 0);

      // Jika item opname ada dan punya selisih (atau diedit), gunakan qty_sistem & qty_fisik dari opname;
      // jika tidak ada selisih dan stok aktual sudah bergerak, sinkronkan dengan stok aktual
      const hasRecordedDiff = it && (parseFloat(it.selisih || 0) !== 0 || (it.alasan && String(it.alasan).trim() !== ''));
      const sistemVal = it
        ? (hasRecordedDiff ? parseFloat(it.qty_sistem || 0) : fallbackStock)
        : fallbackStock;
      const fisikVal = it && it.qty_fisik !== null
        ? (hasRecordedDiff ? parseFloat(it.qty_fisik) : fallbackStock)
        : sistemVal;
      const selisihVal = fisikVal - sistemVal;
      const hargaMaster = parseFloat(p.harga || 0);
      const nilaiSelisihVal = selisihVal * hargaMaster;

      totalSistem += sistemVal;
      totalFisik += fisikVal;
      totalSelisih += selisihVal;
      totalNilaiSelisih += nilaiSelisihVal;

      row.getCell(1).value = idx + 1;
      row.getCell(2).value = p.nama;
      row.getCell(3).value = sistemVal;
      row.getCell(4).value = fisikVal;
      row.getCell(5).value = { formula: `D${rowNum}-C${rowNum}`, result: selisihVal };
      row.getCell(6).value = hargaMaster;
      row.getCell(7).value = { formula: `E${rowNum}*F${rowNum}`, result: nilaiSelisihVal };
      row.getCell(8).value = (it && it.alasan && String(it.alasan).trim() !== '')
        ? it.alasan
        : (selisihVal === 0 ? 'Sesuai (Klop)' : '-');

      for (let c = 1; c <= 8; c++) {
        row.getCell(c).border = borderAll;
        if (c >= 3 && c <= 7) row.getCell(c).numFmt = '#,##0';
      }
    });

    // Baris Total Ringkasan Stok Opname
    const totalRowIdx = products.rows.length + 4;
    const lastDataRowIdx = products.rows.length + 3;
    const totalRow = wsOpname.getRow(totalRowIdx);
    totalRow.getCell(1).value = '';
    totalRow.getCell(2).value = 'TOTAL KESELURUHAN';
    totalRow.getCell(3).value = { formula: `SUM(C4:C${lastDataRowIdx})`, result: totalSistem };
    totalRow.getCell(4).value = { formula: `SUM(D4:D${lastDataRowIdx})`, result: totalFisik };
    totalRow.getCell(5).value = { formula: `SUM(E4:E${lastDataRowIdx})`, result: totalSelisih };
    totalRow.getCell(6).value = '';
    totalRow.getCell(7).value = { formula: `SUM(G4:G${lastDataRowIdx})`, result: totalNilaiSelisih };
    totalRow.getCell(8).value = totalNilaiSelisih < 0 ? 'Defisit / Kerugian Fisik' : totalNilaiSelisih > 0 ? 'Surplus Fisik' : 'Seimbang (Klop)';
    totalRow.font = { bold: true };
    for (let c = 1; c <= 8; c++) {
      totalRow.getCell(c).fill = headerFill;
      totalRow.getCell(c).border = borderAll;
      if (c >= 3 && c <= 7 && c !== 6) totalRow.getCell(c).numFmt = '#,##0';
    }
    
    wsOpname.getColumn(1).width = 6;
    wsOpname.getColumn(2).width = 30;
    for (let c = 3; c <= 7; c++) wsOpname.getColumn(c).width = 16;
    wsOpname.getColumn(8).width = 28;

    return await workbook.xlsx.writeBuffer();
  }
}
module.exports = ReportService;
