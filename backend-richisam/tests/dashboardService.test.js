const ReportService = require('../services/reportService');
const AnalyticsService = require('../services/analyticsService');
const StockService = require('../services/stockService');
const MutationService = require('../services/mutationService');
const pool = require('../config/db');

jest.mock('../config/db', () => ({
  connect: jest.fn(),
  query: jest.fn(),
}));

jest.mock('../services/mutationService', () => ({
  healAccidentalMassZeroMutations: jest.fn().mockResolvedValue(true),
}));

describe('Dashboard Data Testing (ReportService & AnalyticsService)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ReportService.getDashboardStats', () => {
    it('Harus mengembalikan data KPI Dashboard Outlet Alauddin (outlet_id = 2) secara akurat dengan fallback periode aktif', async () => {
      pool.query
        // 1. cabangRes
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        // 2. produkRes
        .mockResolvedValueOnce({ rows: [{ count: '69' }] })
        // 3. parRes (stok <= min_qty & p.is_active = true)
        .mockResolvedValueOnce({ rows: [{ count: '14' }] })
        // 4. defectRes
        .mockResolvedValueOnce({ rows: [{ total: '3' }] })
        // 5. assetRes
        .mockResolvedValueOnce({
          rows: [{ total_unit: '39', total_baik: '38', total_rusak: '1', total_jenis_terdata: '15' }],
        })
        // 6. stockValRes
        .mockResolvedValueOnce({
          rows: [{ total_nilai_persediaan: '37277000', total_unit_stok: '22972' }],
        })
        // 7. mutMonthRes
        .mockResolvedValueOnce({
          rows: [{
            total_masuk_bulan_ini: '28',
            total_keluar_bulan_ini: '77',
            nilai_pemakaian_bulan_ini: '2459000',
            active_month: 10,
            active_year: 2026,
          }],
        })
        // 8. reqSummaryRes
        .mockResolvedValueOnce({
          rows: [{
            total_aktif: '1',
            total_diajukan: '1',
            total_diproses: '0',
            total_dikirim: '0',
            total_selesai_bulan_ini: '2',
          }],
        })
        // 9. opnameSummaryRes
        .mockResolvedValueOnce({
          rows: [{
            total_final_bulan_ini: '1',
            total_draft_aktif: '0',
            shift_closed_hari_ini: '2',
          }],
        })
        // 10. branchPerfRes
        .mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              nama: 'Outlet Alauddin',
              tipe: 'CABANG',
              nilai_stok: '37277000',
              stok_kritis: '14',
              masuk_bulan_ini: '28',
              keluar_bulan_ini: '77',
              nilai_keluar_bulan_ini: '2459000',
              defect_bulan_ini: '3',
            },
          ],
        });

      const stats = await ReportService.getDashboardStats(2, null, null);

      expect(MutationService.healAccidentalMassZeroMutations).toHaveBeenCalled();
      expect(stats.total_cabang).toBe(1);
      expect(stats.total_produk).toBe(69);
      expect(stats.total_stok_menipis).toBe(14);
      expect(stats.total_defect_bulan_ini).toBe(3);
      expect(stats.total_nilai_persediaan).toBe(37277000);
      expect(stats.total_masuk_bulan_ini).toBe(28);
      expect(stats.total_keluar_bulan_ini).toBe(77);
      expect(stats.nilai_pemakaian_bulan_ini).toBe(2459000);
      expect(stats.active_period).toEqual({ bulan: 10, tahun: 2026 });
      expect(stats.assets).toEqual({
        total_unit: 39,
        total_baik: 38,
        total_rusak: 1,
        total_jenis: 15,
      });
      expect(stats.requests_summary.total_aktif).toBe(1);
      expect(stats.opname_summary.shift_closed_hari_ini).toBe(2);
      expect(stats.branch_performance).toHaveLength(1);
      expect(stats.branch_performance[0].nama).toBe('Outlet Alauddin');
    });

    it('Harus menggunakan filter bulan & tahun eksplisit jika dipilih pengguna di Dashboard', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [{ count: '69' }] })
        .mockResolvedValueOnce({ rows: [{ count: '15' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total_unit: '78', total_baik: '76', total_rusak: '2', total_jenis_terdata: '15' }] })
        .mockResolvedValueOnce({ rows: [{ total_nilai_persediaan: '95000000', total_unit_stok: '45000' }] })
        .mockResolvedValueOnce({
          rows: [{
            total_masuk_bulan_ini: '120',
            total_keluar_bulan_ini: '340',
            nilai_pemakaian_bulan_ini: '8500000',
            active_month: 10,
            active_year: 2026,
          }],
        })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      const stats = await ReportService.getDashboardStats(null, 10, 2026);
      expect(stats.active_period).toEqual({ bulan: 10, tahun: 2026 });
      expect(stats.total_masuk_bulan_ini).toBe(120);
      expect(stats.total_keluar_bulan_ini).toBe(340);
    });
  });

  describe('AnalyticsService.getVisualCharts', () => {
    it('Harus menormalisasi satuan gram ke Kg pada Komposisi Kategori dan menghitung grafik visual dengan benar', async () => {
      pool.query
        // 1. fastMovingRes (Top 5 Produk - termasuk 2 produk berawalan "AYAM MARINASI ")
        .mockResolvedValueOnce({
          rows: [
            { id: 1, nama: 'AYAM MARINASI 1 EKOR', satuan: 'ekor', harga: '34123', total_keluar: '30', total_nilai: '1023690' },
            { id: 2, nama: 'AYAM MARINASI POTONG', satuan: 'potong', harga: '5390', total_keluar: '25', total_nilai: '134750' },
            { id: 3, nama: 'BERAS', satuan: 'kg', harga: '25000', total_keluar: '20', total_nilai: '500000' },
          ],
        })
        // 2. trendRes (Tren Harian Top 3)
        .mockResolvedValueOnce({
          rows: [
            { tanggal: '2026-10-29', product_id: 1, nama: 'AYAM MARINASI 1 EKOR', qty: '15' },
            { tanggal: '2026-10-29', product_id: 2, nama: 'AYAM MARINASI POTONG', qty: '10' },
            { tanggal: '2026-10-29', product_id: 3, nama: 'BERAS', qty: '8' },
            { tanggal: '2026-10-30', product_id: 1, nama: 'AYAM MARINASI 1 EKOR', qty: '15' },
            { tanggal: '2026-10-30', product_id: 2, nama: 'AYAM MARINASI POTONG', qty: '15' },
            { tanggal: '2026-10-30', product_id: 3, nama: 'BERAS', qty: '12' },
          ],
        })
        // 3. catRes (Komposisi Kategori)
        .mockResolvedValueOnce({
          rows: [
            { kategori: 'Kemasan & Packaging', total_item: '14', total_stok: '480', total_stok_raw: '480', total_nilai: '12450000' },
            { kategori: 'Saus & Bumbu', total_item: '14', total_stok: '451', total_stok_raw: '21430', total_nilai: '8920000' },
          ],
        })
        // 4. inOutRes (Rasio Logistik Cabang)
        .mockResolvedValueOnce({
          rows: [
            { branch_name: 'Outlet Alauddin', total_masuk: '28', total_keluar: '77' },
          ],
        });

      const charts = await AnalyticsService.getVisualCharts(2, 10, 2026);

      // Verifikasi query kategori memiliki logika konversi gram/ml -> Kg/L
      const categorySql = pool.query.mock.calls[2][0];
      expect(categorySql).toContain("LOWER(p.satuan) IN ('gram', 'gr', 'ml')");
      expect(categorySql).toContain('s.qty_current::numeric / p.konversi::numeric');

      // Verifikasi hasil distribusi kategori
      expect(charts.category_distribution).toHaveLength(2);
      expect(charts.category_distribution[1]).toMatchObject({
        name: 'Saus & Bumbu',
        total_item: 14,
        total_stok: 451,
        total_stok_raw: 21430,
        total_nilai: 8920000,
      });

      // Verifikasi top_products, daily_usage_trend (tidak tertimpa antara AYAM MARINASI 1 EKOR & POTONG) & branch_comparison
      expect(charts.top_products).toHaveLength(3);
      expect(charts.top_products[0].qty).toBe(30);
      expect(charts.daily_usage_trend).toHaveLength(2);
      expect(charts.daily_usage_trend[0]['AYAM MARINASI 1 EKOR']).toBe(15);
      expect(charts.daily_usage_trend[0]['AYAM MARINASI POTONG']).toBe(10);
      expect(charts.daily_usage_trend[0]['BERAS']).toBe(8);
      expect(charts.branch_comparison).toEqual([
        { cabang: 'Outlet Alauddin', masuk: 28, keluar: 77 },
      ]);
    });
  });

  describe('StockService.getLowStocks (Peringatan Par Stock Dashboard)', () => {
    it('Harus hanya mengambil produk aktif (p.is_active = true) yang stoknya <= min_qty di cabang terkait', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            outlet_name: 'Outlet Alauddin',
            product_name: 'SAUCE PILLOW',
            satuan: 'pack',
            qty_current: 5,
            min_qty: 6,
            selisih: 1,
            outlet_id: 2,
            product_id: 25,
          },
        ],
      });

      const lowStocks = await StockService.getLowStocks(2);
      const sql = pool.query.mock.calls[0][0];
      expect(sql).toContain('s.qty_current <= ps.min_qty');
      expect(sql).toContain('p.is_active = true');
      expect(lowStocks).toHaveLength(1);
      expect(lowStocks[0].product_name).toBe('SAUCE PILLOW');
    });
  });
});
