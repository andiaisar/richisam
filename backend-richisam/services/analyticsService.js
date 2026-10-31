const pool = require('../config/db');
const MutationService = require('./mutationService');

class AnalyticsService {
  /**
   * Menghitung Klasifikasi ABC (Hukum Pareto 80/20)
   * Kelas A: ~80% nilai persediaan
   * Kelas B: ~15% nilai persediaan
   * Kelas C: ~5% nilai persediaan
   */
  static async getABCAnalysis(outlet_id, start_date, end_date) {
    const params = [start_date, end_date];
    let outletFilter = '';
    if (outlet_id) {
      params.push(parseInt(outlet_id));
      outletFilter = `AND m.outlet_id = $${params.length}`;
    }
    const query = `
      SELECT p.id, p.kode, p.nama, p.harga, p.satuan,
             SUM(m.keluar) as total_keluar,
             (SUM(m.keluar) * p.harga) as total_nilai
      FROM products p
      JOIN stock_mutations m ON p.id = m.product_id
      WHERE m.tanggal >= $1 AND m.tanggal <= $2
        ${outletFilter}
      GROUP BY p.id, p.kode, p.nama, p.harga, p.satuan
      HAVING SUM(m.keluar) > 0
      ORDER BY total_nilai DESC
    `;
    const res = await pool.query(query, params);
    
    const items = res.rows;
    const grandTotal = items.reduce((sum, item) => sum + parseFloat(item.total_nilai), 0);
    
    let cumulative = 0;
    const result = items.map((item, index) => {
      const nilai = parseFloat(item.total_nilai);
      const percentage = (nilai / grandTotal) * 100;
      cumulative += percentage;
      
      let klasifikasi = 'C';
      if (cumulative <= 80) {
        klasifikasi = 'A';
      } else if (cumulative <= 95) {
        klasifikasi = 'B';
      } else {
        // Edge case for the very first item if it exceeds 80%
        if (index === 0) klasifikasi = 'A';
      }
      
      return {
        ...item,
        total_keluar: parseInt(item.total_keluar),
        total_nilai: nilai,
        persentase: percentage,
        kumulatif: cumulative,
        kelas: klasifikasi
      };
    });
    
    return { 
      summary: {
        total_items: items.length,
        total_nilai: grandTotal,
        kelas_A_count: result.filter(r => r.kelas === 'A').length,
        kelas_B_count: result.filter(r => r.kelas === 'B').length,
        kelas_C_count: result.filter(r => r.kelas === 'C').length,
      },
      data: result 
    };
  }

  /**
   * Menghitung Peramalan (Forecasting) dengan metode Weighted Moving Average (WMA)
   */
  static async getDemandForecast(outlet_id, product_id, history_days = 7) {
    const safeDays = Math.max(1, parseInt(history_days) || 7);
    // Ambil data konsumsi harian agregat
    const query = `
      SELECT tanggal, SUM(keluar) as total_keluar
      FROM stock_mutations
      WHERE outlet_id = $1 AND product_id = $2
        AND tanggal >= CURRENT_DATE - ($3 * INTERVAL '1 day')
        AND tanggal <= CURRENT_DATE
      GROUP BY tanggal
      ORDER BY tanggal ASC
    `;
    
    const res = await pool.query(query, [outlet_id, product_id, safeDays]);
    const history = res.rows.map(row => ({
      tanggal: row.tanggal.toISOString().split('T')[0],
      actual_keluar: parseInt(row.total_keluar)
    }));
    
    // Kalkulasi WMA (Weighted Moving Average)
    let wma_next_day = 0;
    let sma_next_day = 0;
    let totalBobot = 0;
    let totalKeluar = 0;
    
    if (history.length > 0) {
      let weight = 1;
      history.forEach((h) => {
        wma_next_day += h.actual_keluar * weight;
        totalBobot += weight;
        totalKeluar += h.actual_keluar;
        weight++;
      });
      wma_next_day = wma_next_day / totalBobot;
      sma_next_day = totalKeluar / history.length;
    }
    
    // Generate data tren harian untuk chart (kita sisipkan prediksi WMA berjalannya)
    // agar grafiknya menarik di Dasbor
    const chartData = [];
    const recentHistory = history.slice(-7); // Tampilkan 7 hari terakhir di chart
    
    for (let i = 0; i < recentHistory.length; i++) {
      chartData.push({
        tanggal: recentHistory[i].tanggal,
        actual: recentHistory[i].actual_keluar,
        // WMA berjalan di masa lalu (hanya simulasi sederhana)
        forecast: sma_next_day // Dibuat rata-rata untuk baseline perbandingan
      });
    }

    // Hari besok
    const besok = new Date();
    besok.setDate(besok.getDate() + 1);
    const tglBesok = besok.toISOString().split('T')[0];
    
    return {
      history_used: history.length,
      wma_1_hari: Math.ceil(wma_next_day),
      wma_7_hari: Math.ceil(wma_next_day * 7),
      sma_1_hari: Math.ceil(sma_next_day),
      chartData: chartData,
      next_forecast_date: tglBesok
    };
  }

  /**
   * Mengambil Data Grafik Visual Analytics (Line, Bar, Donut, Stacked)
   */
  static async getVisualCharts(outlet_id = null, bulan = null, tahun = null) {
    await MutationService.healAccidentalMassZeroMutations();
    const parsedOutletId = outlet_id ? parseInt(outlet_id, 10) : null;
    const hasOutlet = Number.isInteger(parsedOutletId) && parsedOutletId > 0;
    const hasExplicitPeriod =
      bulan !== null && bulan !== undefined && bulan !== '' &&
      tahun !== null && tahun !== undefined && tahun !== '';
    const periodCondition = hasExplicitPeriod
      ? `AND EXTRACT(MONTH FROM m.tanggal) = ${parseInt(bulan, 10)} AND EXTRACT(YEAR FROM m.tanggal) = ${parseInt(tahun, 10)}`
      : '';
    const outletCondition = `${hasOutlet ? `AND m.outlet_id = ${parsedOutletId}` : ''} ${periodCondition}`;
    const outletStockCondition = hasOutlet ? `AND s.outlet_id = ${parsedOutletId}` : '';

    // 1. Top 5 Fast Moving Products (Konsumsi Tertinggi)
    const fastMovingQuery = `
      SELECT p.id, p.nama, p.satuan, p.harga,
             SUM(m.keluar) as total_keluar,
             (SUM(m.keluar) * COALESCE(p.harga, 0)) as total_nilai
      FROM stock_mutations m
      JOIN products p ON m.product_id = p.id
      WHERE 1=1 ${outletCondition}
      GROUP BY p.id, p.nama, p.satuan, p.harga
      HAVING SUM(m.keluar) > 0
      ORDER BY total_keluar DESC
      LIMIT 5
    `;
    const fastMovingRes = await pool.query(fastMovingQuery);

    // 2. Daily Usage Trend for Top 3 Key Items (gunakan nama unik per product_id agar tidak saling menimpa)
    const top3Rows = fastMovingRes.rows.slice(0, 3);
    const top3Ids = top3Rows.map(r => r.id);
    const idToLabelMap = new Map();
    const usedLabels = new Set();
    for (const r of top3Rows) {
      let label = String(r.nama || '').trim();
      if (usedLabels.has(label)) {
        label = `${label} (#${r.id})`;
      }
      usedLabels.add(label);
      idToLabelMap.set(r.id, label);
    }
    const top3Labels = Array.from(idToLabelMap.values());

    let dailyTrends = [];
    if (top3Ids.length > 0) {
      const trendQuery = `
        SELECT m.tanggal, p.id as product_id, p.nama, SUM(m.keluar) as qty
        FROM stock_mutations m
        JOIN products p ON m.product_id = p.id
        WHERE p.id = ANY($1) ${outletCondition}
        GROUP BY m.tanggal, p.id, p.nama
        ORDER BY m.tanggal ASC
      `;
      const trendRes = await pool.query(trendQuery, [top3Ids]);
      
      const dateMap = new Map();
      for (const row of trendRes.rows) {
        const dStr = row.tanggal instanceof Date
          ? row.tanggal.toISOString().split('T')[0]
          : String(row.tanggal).split('T')[0];
        const dateObj = new Date(dStr + 'T00:00:00');
        const label = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        
        if (!dateMap.has(dStr)) {
          const initialEntry = { tanggal: label, rawDate: dStr };
          for (const sName of top3Labels) {
            initialEntry[sName] = 0;
          }
          dateMap.set(dStr, initialEntry);
        }
        const entry = dateMap.get(dStr);
        const itemLabel = idToLabelMap.get(row.product_id) || String(row.nama || '').trim();
        entry[itemLabel] = (entry[itemLabel] || 0) + (parseInt(row.qty, 10) || 0);
      }
      dailyTrends = Array.from(dateMap.values());

      // Jika baru ada 1 tanggal mutasi, tambahkan titik baseline H-1 (nilai 0) agar AreaChart tetap membentuk garis & area visual
      if (dailyTrends.length === 1 && dailyTrends[0].rawDate) {
        const firstDate = new Date(dailyTrends[0].rawDate + 'T00:00:00');
        firstDate.setDate(firstDate.getDate() - 1);
        const prevRaw = firstDate.toISOString().split('T')[0];
        const prevLabel = firstDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const baselineEntry = { tanggal: prevLabel, rawDate: prevRaw };
        for (const sName of top3Labels) {
          baselineEntry[sName] = 0;
        }
        dailyTrends.unshift(baselineEntry);
      }
    }

    // 3. Category Distribution (Item count, Normalized Stock in main unit, Raw Stock & Total Value per outlet)
    const categoryQuery = `
      SELECT 
        COALESCE(p.kategori, 'Bahan Umum') as kategori,
        COUNT(DISTINCT p.id) as total_item,
        COALESCE(SUM(
          CASE 
            WHEN LOWER(p.satuan) IN ('gram', 'gr', 'ml') AND COALESCE(p.konversi, 1) >= 100
              THEN ROUND(s.qty_current::numeric / p.konversi::numeric, 1)
            ELSE COALESCE(s.qty_current, 0)::numeric
          END
        ), 0) as total_stok,
        COALESCE(SUM(s.qty_current), 0) as total_stok_raw,
        COALESCE(SUM(s.qty_current * COALESCE(p.harga, 0)), 0) as total_nilai
      FROM products p
      LEFT JOIN stocks s ON p.id = s.product_id ${outletStockCondition}
      WHERE p.is_active = true
      GROUP BY p.kategori
      ORDER BY total_stok DESC, total_nilai DESC, total_item DESC
    `;
    const catRes = await pool.query(categoryQuery);
    
    const colors = ['#F9610D', '#FFCE00', '#10B981', '#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6'];
    const categoryDistribution = catRes.rows.map((row, idx) => ({
      name: row.kategori,
      total_item: parseInt(row.total_item, 10) || 0,
      total_stok: Math.round(parseFloat(row.total_stok) || 0),
      total_stok_raw: parseInt(row.total_stok_raw, 10) || 0,
      total_nilai: parseFloat(row.total_nilai) || 0,
      color: colors[idx % colors.length]
    }));

    // 4. In vs Out Logistics Ratio per Outlet (respects outlet_id & period filter if provided)
    const branchWhere = hasOutlet ? `WHERE o.is_active = true AND o.id = ${parsedOutletId}` : `WHERE o.is_active = true`;
    const inOutJoinCond = hasExplicitPeriod
      ? `ON o.id = m.outlet_id AND EXTRACT(MONTH FROM m.tanggal) = ${parseInt(bulan, 10)} AND EXTRACT(YEAR FROM m.tanggal) = ${parseInt(tahun, 10)}`
      : `ON o.id = m.outlet_id`;
    const inOutQuery = `
      SELECT o.nama as branch_name,
             COALESCE(SUM(m.masuk), 0) as total_masuk,
             COALESCE(SUM(m.keluar), 0) as total_keluar
      FROM outlets o
      LEFT JOIN stock_mutations m ${inOutJoinCond}
      ${branchWhere}
      GROUP BY o.id, o.nama, o.tipe
      ORDER BY o.tipe DESC, o.id ASC
    `;
    const inOutRes = await pool.query(inOutQuery);
    const branchComparison = inOutRes.rows.map(r => ({
      cabang: r.branch_name.replace('Richisam', '').trim() || r.branch_name,
      masuk: parseInt(r.total_masuk, 10) || 0,
      keluar: parseInt(r.total_keluar, 10) || 0
    }));

    return {
      top_products: fastMovingRes.rows.map(r => ({
        id: r.id,
        nama: r.nama,
        satuan: r.satuan,
        qty: parseInt(r.total_keluar, 10) || 0,
        nilai: parseFloat(r.total_nilai) || 0
      })),
      daily_usage_trend: dailyTrends,
      category_distribution: categoryDistribution,
      branch_comparison: branchComparison
    };
  }
}

module.exports = AnalyticsService;
