const pool = require('../config/db');

class AnalyticsService {
  /**
   * Menghitung Klasifikasi ABC (Hukum Pareto 80/20)
   * Kelas A: ~80% nilai persediaan
   * Kelas B: ~15% nilai persediaan
   * Kelas C: ~5% nilai persediaan
   */
  static async getABCAnalysis(outlet_id, start_date, end_date) {
    const query = `
      SELECT p.id, p.kode, p.nama, p.harga, p.satuan,
             SUM(m.keluar) as total_keluar,
             (SUM(m.keluar) * p.harga) as total_nilai
      FROM products p
      JOIN stock_mutations m ON p.id = m.product_id
      WHERE m.tanggal >= $1 AND m.tanggal <= $2
        ${outlet_id ? `AND m.outlet_id = ${parseInt(outlet_id)}` : ''}
      GROUP BY p.id, p.kode, p.nama, p.harga, p.satuan
      HAVING SUM(m.keluar) > 0
      ORDER BY total_nilai DESC
    `;
    const res = await pool.query(query, [start_date, end_date]);
    
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
    // Ambil data konsumsi harian agregat
    const query = `
      SELECT tanggal, SUM(keluar) as total_keluar
      FROM stock_mutations
      WHERE outlet_id = $1 AND product_id = $2
        AND tanggal >= CURRENT_DATE - INTERVAL '${history_days} days'
        AND tanggal <= CURRENT_DATE
      GROUP BY tanggal
      ORDER BY tanggal ASC
    `;
    
    const res = await pool.query(query, [outlet_id, product_id]);
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
  static async getVisualCharts(outlet_id = null) {
    let outletCondition = outlet_id ? `AND m.outlet_id = ${parseInt(outlet_id)}` : '';
    let outletStockCondition = outlet_id ? `AND s.outlet_id = ${parseInt(outlet_id)}` : '';

    // 1. Top 5 Fast Moving Products (Konsumsi Tertinggi)
    const fastMovingQuery = `
      SELECT p.id, p.nama, p.satuan, p.harga,
             SUM(m.keluar) as total_keluar,
             (SUM(m.keluar) * COALESCE(p.harga, 0)) as total_nilai
      FROM stock_mutations m
      JOIN products p ON m.product_id = p.id
      WHERE 1=1 ${outletCondition}
      GROUP BY p.id, p.nama, p.satuan, p.harga
      ORDER BY total_keluar DESC
      LIMIT 5
    `;
    const fastMovingRes = await pool.query(fastMovingQuery);

    // 2. Daily Usage Trend for Top 3 Key Items
    const top3Ids = fastMovingRes.rows.slice(0, 3).map(r => r.id);
    let dailyTrends = [];
    if (top3Ids.length > 0) {
      const trendQuery = `
        SELECT m.tanggal, p.nama, SUM(m.keluar) as qty
        FROM stock_mutations m
        JOIN products p ON m.product_id = p.id
        WHERE p.id = ANY($1) ${outletCondition}
        GROUP BY m.tanggal, p.nama
        ORDER BY m.tanggal ASC
      `;
      const trendRes = await pool.query(trendQuery, [top3Ids]);
      
      const dateMap = new Map();
      for (const row of trendRes.rows) {
        const dStr = row.tanggal.toISOString().split('T')[0];
        const dateObj = new Date(row.tanggal);
        const label = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        
        if (!dateMap.has(dStr)) {
          dateMap.set(dStr, { tanggal: label, rawDate: dStr });
        }
        const entry = dateMap.get(dStr);
        const shortName = row.nama.length > 15 ? row.nama.substring(0, 14) + '..' : row.nama;
        entry[shortName] = parseInt(row.qty);
      }
      dailyTrends = Array.from(dateMap.values());
    }

    // 3. Category Distribution (Item count & Total current stock)
    const categoryQuery = `
      SELECT 
        COALESCE(p.kategori, 'Bahan Umum') as kategori,
        COUNT(DISTINCT p.id) as total_item,
        COALESCE(SUM(s.qty_current), 0) as total_stok,
        COALESCE(SUM(s.qty_current * p.harga), 0) as total_nilai
      FROM products p
      LEFT JOIN stocks s ON p.id = s.product_id ${outletStockCondition}
      WHERE p.is_active = true
      GROUP BY p.kategori
      ORDER BY total_item DESC
    `;
    const catRes = await pool.query(categoryQuery);
    
    const colors = ['#F9610D', '#FFCE00', '#10B981', '#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6'];
    const categoryDistribution = catRes.rows.map((row, idx) => ({
      name: row.kategori,
      total_item: parseInt(row.total_item),
      total_stok: parseInt(row.total_stok),
      total_nilai: parseFloat(row.total_nilai),
      color: colors[idx % colors.length]
    }));

    // 4. In vs Out Logistics Ratio per Outlet
    const inOutQuery = `
      SELECT o.nama as branch_name,
             COALESCE(SUM(m.masuk), 0) as total_masuk,
             COALESCE(SUM(m.keluar), 0) as total_keluar
      FROM outlets o
      LEFT JOIN stock_mutations m ON o.id = m.outlet_id
      WHERE o.is_active = true
      GROUP BY o.id, o.nama
      ORDER BY o.tipe DESC, o.id ASC
    `;
    const inOutRes = await pool.query(inOutQuery);
    const branchComparison = inOutRes.rows.map(r => ({
      cabang: r.branch_name.replace('Richisam', '').trim(),
      masuk: parseInt(r.total_masuk),
      keluar: parseInt(r.total_keluar)
    }));

    return {
      top_products: fastMovingRes.rows.map(r => ({
        id: r.id,
        nama: r.nama,
        satuan: r.satuan,
        qty: parseInt(r.total_keluar),
        nilai: parseFloat(r.total_nilai)
      })),
      daily_usage_trend: dailyTrends,
      category_distribution: categoryDistribution,
      branch_comparison: branchComparison
    };
  }
}

module.exports = AnalyticsService;
