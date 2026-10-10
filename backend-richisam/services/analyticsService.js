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
}

module.exports = AnalyticsService;
