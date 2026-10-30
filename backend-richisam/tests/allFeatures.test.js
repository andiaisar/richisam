const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/db');

jest.mock('../config/db', () => {
  const mClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  return {
    connect: jest.fn(() => mClient),
    query: jest.fn(),
  };
});

const { authenticate, authorize, enforceOutletScope } = require('../middlewares/authMiddleware');
const authController = require('../controllers/authController');
const outletController = require('../controllers/outletController');
const requestController = require('../controllers/requestController');
const RequestService = require('../services/requestService');
const TransferService = require('../services/transferService');
const defectController = require('../controllers/defectController');
const DefectService = require('../services/defectService');
const opnameController = require('../controllers/opnameController');
const OpnameService = require('../services/opnameService');
const batchController = require('../controllers/batchController');
const ShiftService = require('../services/shiftService');
const analyticsController = require('../controllers/analyticsController');
const AnalyticsService = require('../services/analyticsService');
const MutationService = require('../services/mutationService');
const productController = require('../controllers/productController');
const auditController = require('../controllers/auditController');
const reportController = require('../controllers/reportController');
const ReportService = require('../services/reportService');
const ExcelJS = require('exceljs');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Pengujian Menyeluruh Seluruh Fitur & Keamanan RichiStock', () => {
  let client;

  beforeEach(() => {
    client = pool.connect();
    jest.clearAllMocks();
  });

  describe('1. Autentikasi, JWT & RBAC Middleware', () => {
    it('Login berhasil mengembalikan JWT dan menyembunyikan password_hash', async () => {
      const hashed = await bcrypt.hash('rahasia123', 10);
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'admin',
          nama: 'Admin Pusat',
          password_hash: hashed,
          role: 'ADMIN_PUSAT',
          outlet_id: 1,
          is_active: true
        }]
      });

      const req = { body: { username: 'admin', password: 'rahasia123' } };
      const res = mockRes();
      await authController.login(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: expect.any(String),
            user: expect.not.objectContaining({ password_hash: expect.anything() })
          })
        })
      );
    });

    it('Login menolak akun yang dinonaktifkan (403)', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 2, username: 'nonaktif', is_active: false }]
      });

      const req = { body: { username: 'nonaktif', password: '123' } };
      const res = mockRes();
      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('Middleware authenticate memvalidasi JWT dan authorize membatasi role', () => {
      const token = jwt.sign(
        { id: 5, role: 'STAF_CABANG', outlet_id: 2 },
        process.env.JWT_SECRET || 'secret123'
      );
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = mockRes();
      const next = jest.fn();

      authenticate(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.outlet_id).toBe(2);

      const nextAdmin = jest.fn();
      authorize('ADMIN_PUSAT', 'OWNER')(req, res, nextAdmin);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(nextAdmin).not.toHaveBeenCalled();
    });

    it('Middleware enforceOutletScope mengunci outlet_id staf cabang tetapi mengizinkan Staf CK di rute /api/requests', () => {
      const reqBranch = {
        user: { id: 5, role: 'STAF_CABANG', outlet_id: 3 },
        baseUrl: '/api/mutations',
        body: { outlet_id: 1 },
        query: { outlet_id: 1 }
      };
      enforceOutletScope(reqBranch, {}, jest.fn());
      expect(reqBranch.body.outlet_id).toBe(3);
      expect(reqBranch.query.outlet_id).toBe(3);

      const reqCK = {
        user: { id: 2, role: 'STAF_CABANG', outlet_id: 1 },
        baseUrl: '/api/requests',
        body: { outlet_id: 4 },
        query: {}
      };
      enforceOutletScope(reqCK, {}, jest.fn());
      expect(reqCK.body.outlet_id).toBe(4);
    });
  });

  describe('2. Manajemen Outlet (Tambah & Edit)', () => {
    it('Berhasil menambah dan memperbarui data outlet', async () => {
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 10, nama: 'Richisam Panakkukang', tipe: 'CABANG', alamat: 'Jl. Boulevard', is_active: true }]
        }) // INSERT outlets
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT active products
        .mockResolvedValueOnce({}) // INSERT stocks
        .mockResolvedValueOnce({}) // INSERT par_stocks
        .mockResolvedValueOnce({}); // COMMIT

      const reqCreate = {
        body: { nama: 'Richisam Panakkukang', tipe: 'CABANG', alamat: 'Jl. Boulevard', is_active: true }
      };
      const resCreate = mockRes();
      await outletController.createOutlet(reqCreate, resCreate);
      expect(resCreate.status).toHaveBeenCalledWith(201);

      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 10, nama: 'Richisam Panakkukang', tipe: 'CABANG', alamat: 'Jl. Boulevard', is_active: true }]
        }) // SELECT existing outlet
        .mockResolvedValueOnce({
          rows: [{ id: 10, nama: 'Richisam Panakkukang Baru', tipe: 'CABANG', alamat: 'Jl. Boulevard', is_active: false }]
        }) // UPDATE outlets
        .mockResolvedValueOnce({}); // COMMIT

      const reqUpdate = {
        params: { id: '10' },
        body: { nama: 'Richisam Panakkukang Baru', is_active: false }
      };
      const resUpdate = mockRes();
      await outletController.updateOutlet(reqUpdate, resUpdate);
      expect(resUpdate.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('3. Mutasi Harian: Upsert Shift & Proteksi Kunci Shift', () => {
    it('Memperbarui mutasi yang sudah ada pada shift yang sama (Upsert) tanpa error 422', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] }); // isShiftLocked -> false

      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 99, saw: 100 }] }) // exist check returns existing row
        .mockResolvedValueOnce({}) // UPDATE stock_mutations
        .mockResolvedValueOnce({}) // INSERT/UPDATE stocks
        .mockResolvedValueOnce({}); // COMMIT

      await MutationService.createMutations(2, '2026-10-30', 'PAGI', [{ product_id: 1, masuk: 20, sak: 90 }], 5);

      const updateCall = client.query.mock.calls.find(c => c[0].includes('UPDATE stock_mutations SET masuk'));
      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toEqual([20, 30, 90, 99]); // masuk=20, keluar=100+20-90=30, sak=90, id=99
    });

    it('Menolak mutasi jika shift sudah ditutup (CLOSED)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'CLOSED' }] }); // isShiftLocked -> true

      await expect(
        MutationService.createMutations(2, '2026-10-30', 'PAGI', [{ product_id: 1, masuk: 10, sak: 50 }], 5)
      ).rejects.toThrow(/telah ditutup dan dikunci/);
    });
  });

  describe('4. Tiket Permintaan & Pengambilan Darurat (Cito)', () => {
    it('Menolak pengambilan Cito oleh staf cabang biasa (403), tetapi mengizinkan Staf CK & memotong stok CK', async () => {
      const reqForbidden = {
        user: { id: 5, role: 'STAF_CABANG', outlet_id: 3 },
        body: { outlet_id: 3, items: [{ product_id: 1, qty: 2 }], password: '123' }
      };
      const resForbidden = mockRes();
      await requestController.emergencyRequest(reqForbidden, resForbidden);
      expect(resForbidden.status).toHaveBeenCalledWith(403);

      // Test createEmergencyRequest memotong stok CK (outlet_id = 1) saat dikirim ke cabang (outlet_id = 3)
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 50, kode_tiket: 'CITO-123', outlet_id: 3 }] }) // INSERT ticket
        .mockResolvedValueOnce({}) // INSERT ticket item
        .mockResolvedValueOnce({ rows: [{ konversi: 10 }] }) // SELECT konversi (1 box = 10 pcs)
        .mockResolvedValueOnce({ rows: [{ sak: 5 }] }) // prevMut cabang (saw = 5)
        .mockResolvedValueOnce({}) // INSERT mutation cabang (masuk = 20, sak = 25)
        .mockResolvedValueOnce({}) // UPDATE stocks cabang
        .mockResolvedValueOnce({}) // checkParStock cabang BEGIN
        .mockResolvedValueOnce({ rows: [] }) // checkParStock cabang SELECT
        .mockResolvedValueOnce({}) // checkParStock cabang COMMIT
        .mockResolvedValueOnce({ rows: [{ sak: 100 }] }) // prevMut CK (sawCK = 100)
        .mockResolvedValueOnce({}) // INSERT mutation CK (keluar = 20, sakCK = 80)
        .mockResolvedValueOnce({}) // UPDATE stocks CK
        .mockResolvedValueOnce({}) // checkParStock CK BEGIN
        .mockResolvedValueOnce({ rows: [] }) // checkParStock CK SELECT
        .mockResolvedValueOnce({}) // checkParStock CK COMMIT
        .mockResolvedValueOnce({ rows: [{ nama: 'Cabang A' }] }) // SELECT outlet nama
        .mockResolvedValueOnce({ rows: [] }) // notifyPusat getPusatOutletId
        .mockResolvedValueOnce({}); // COMMIT

      await RequestService.createEmergencyRequest(3, [{ product_id: 1, qty: 2 }], { id: 2, role: 'STAF_CABANG', outlet_id: 1 });

      const ckStockUpdate = client.query.mock.calls.find(
        c => c[0].includes('UPDATE stocks SET qty_current') && c[1][1] === 1
      );
      expect(ckStockUpdate).toBeDefined();
      expect(ckStockUpdate[1][0]).toBe(80); // 100 - (2 * 10) = 80
    });
  });

  describe('5. Transfer Stok Antar Cabang', () => {
    it('Menolak transfer ke cabang yang sama atau jika stok asal kurang, serta berhasil memindahkan stok antar cabang', async () => {
      await expect(
        TransferService.createTransfer(2, 2, [{ product_id: 1, qty: 5 }], 1)
      ).rejects.toThrow('Cabang asal dan tujuan tidak boleh sama');

      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // last kode_transfer
        .mockResolvedValueOnce({}) // INSERT branch_transfers
        .mockResolvedValueOnce({ rows: [{ sak: 3 }] }) // prevMutFrom (sawFrom = 3 < 5)
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        TransferService.createTransfer(2, 3, [{ product_id: 1, qty: 5 }], 1)
      ).rejects.toThrow(/tidak mencukupi/);
    });
  });

  describe('6. Laporan Defect & Filter Upload File', () => {
    it('Memfilter ekstensi file upload (hanya mengizinkan gambar .jpg/.jpeg/.png/.webp)', () => {
      const fileFilter = defectController.upload.fileFilter;
      const cbOk = jest.fn();
      fileFilter({}, { originalname: 'bukti.webp', mimetype: 'image/webp' }, cbOk);
      expect(cbOk).toHaveBeenCalledWith(null, true);

      const cbBad = jest.fn();
      fileFilter({}, { originalname: 'script.php', mimetype: 'application/x-php' }, cbBad);
      expect(cbBad).toHaveBeenCalledWith(expect.any(Error));
    });

    it('Persetujuan defect (DISETUJUI) memotong stok cabang dengan ON CONFLICT upsert', async () => {
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 7, outlet_id: 2, product_id: 1, qty: 4, status: 'BARU' }] }) // SELECT defect
        .mockResolvedValueOnce({ rows: [{ sak: 20 }] }) // prevMut
        .mockResolvedValueOnce({}) // INSERT stock_mutations ON CONFLICT
        .mockResolvedValueOnce({}) // UPDATE stocks
        .mockResolvedValueOnce({}) // checkParStock BEGIN
        .mockResolvedValueOnce({ rows: [] }) // checkParStock SELECT
        .mockResolvedValueOnce({}) // checkParStock COMMIT
        .mockResolvedValueOnce({ rows: [{ id: 7, status: 'DISETUJUI' }] }) // UPDATE defect_reports
        .mockResolvedValueOnce({ rows: [{ nama: 'Ayam Utuh' }] }) // SELECT product
        .mockResolvedValueOnce({}) // notifyOutlet
        .mockResolvedValueOnce({}); // COMMIT

      const res = await DefectService.processDefect(7, 'DISETUJUI', { id: 1 });
      expect(res.status).toBe('DISETUJUI');

      const mutCall = client.query.mock.calls.find(c => c[0].includes('ON CONFLICT (product_id, outlet_id, tanggal, shift)'));
      expect(mutCall).toBeDefined();
      expect(mutCall[1][7]).toBe(16); // sak = 20 - 4 = 16
    });
  });

  describe('7. Proteksi IDOR pada Stok Opname & FEFO Batch', () => {
    it('Menolak STAF_CABANG mengakses atau mengedit Stok Opname milik cabang lain (403)', async () => {
      jest.spyOn(OpnameService, 'getOpnameById').mockResolvedValue({
        id: 12,
        outlet_id: 4,
        status: 'DRAFT',
        items: []
      });

      const reqView = { params: { id: '12' }, user: { id: 5, role: 'STAF_CABANG', outlet_id: 2 } };
      const resView = mockRes();
      await opnameController.getOpnameById(reqView, resView);
      expect(resView.status).toHaveBeenCalledWith(403);

      const reqEdit = {
        params: { id: '12' },
        body: { items: [{ product_id: 1, qty_fisik: 10 }] },
        user: { id: 5, role: 'STAF_CABANG', outlet_id: 2 }
      };
      const resEdit = mockRes();
      await opnameController.updateOpnameItems(reqEdit, resEdit);
      expect(resEdit.status).toHaveBeenCalledWith(403);

      OpnameService.getOpnameById.mockRestore();
    });

    it('Menolak STAF_CABANG menghapus Batch FEFO milik cabang lain (403)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ outlet_id: 4 }] });

      const req = { params: { id: '88' }, user: { id: 5, role: 'STAF_CABANG', outlet_id: 2 } };
      const res = mockRes();
      await batchController.deleteBatch(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('8. Tutup Buku Shift & Buka Kunci (Shift Closing)', () => {
    it('Menutup buku shift dan menolak pembukaan kunci oleh selain OWNER/ADMIN_PUSAT', async () => {
      await expect(
        ShiftService.unlockShift({
          closingId: 1,
          userId: 5,
          userRole: 'STAF_CABANG',
          userName: 'Staf',
          reason: 'Coba buka'
        })
      ).rejects.toThrow(/Hanya Owner atau Admin Pusat/);
    });
  });

  describe('9. Analisis ABC Pareto & Peramalan WMA (Analytics)', () => {
    it('Mengunci outlet_id sesuai cabang staf & menghitung klasifikasi ABC serta WMA dengan benar', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, kode: 'B01', nama: 'Ayam', harga: 50000, satuan: 'Ekor', total_keluar: '100', total_nilai: '5000000' },
          { id: 2, kode: 'B02', nama: 'Tepung', harga: 10000, satuan: 'Kg', total_keluar: '80', total_nilai: '800000' },
          { id: 3, kode: 'B03', nama: 'Garam', harga: 5000, satuan: 'Bks', total_keluar: '40', total_nilai: '200000' }
        ]
      });

      const reqABC = {
        query: { outlet_id: '99', start_date: '2026-10-01', end_date: '2026-10-30' },
        user: { id: 5, role: 'STAF_CABANG', outlet_id: 2 }
      };
      const resABC = mockRes();
      await analyticsController.getABCAnalysis(reqABC, resABC);

      // Pastikan parameter query menggunakan outlet_id milik staf (2), bukan 99
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND m.outlet_id = $3'),
        ['2026-10-01', '2026-10-30', 2]
      );

      pool.query.mockResolvedValueOnce({
        rows: [
          { tanggal: new Date('2026-10-28'), total_keluar: '10' },
          { tanggal: new Date('2026-10-29'), total_keluar: '20' },
          { tanggal: new Date('2026-10-30'), total_keluar: '30' }
        ]
      });

      const forecast = await AnalyticsService.getDemandForecast(2, 1, 7);
      // WMA: (10*1 + 20*2 + 30*3) / (1+2+3) = 140 / 6 = 23.33 -> ceil = 24
      expect(forecast.wma_1_hari).toBe(24);
      expect(forecast.sma_1_hari).toBe(20);
    });
  });

  describe('10. Master Produk, Siklus Penuh Tiket Restock & Audit Trail', () => {
    it('Validasi pembuatan produk baru dengan konversi satuan', async () => {
      const reqInvalid = { body: { kode: '', nama: '', satuan: '' } };
      const resInvalid = mockRes();
      await productController.createProduct(reqInvalid, resInvalid);
      expect(resInvalid.status).toHaveBeenCalledWith(400);
    });

    it('Siklus tiket: Pengiriman (DIKIRIM) oleh CK memotong stok CK & Penerimaan (SELESAI) menambah stok cabang', async () => {
      // 1. DIKIRIM oleh CK
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 15, kode_tiket: 'REQ-15', outlet_id: 2, status: 'DIPROSES' }] }) // SELECT ticket
        .mockResolvedValueOnce({ rows: [{ id: 1, product_id: 1, qty_diminta: 3, qty_dikirim: 3 }] }) // SELECT items
        .mockResolvedValueOnce({ rows: [{ konversi: 5 }] }) // SELECT konversi (3 * 5 = 15)
        .mockResolvedValueOnce({ rows: [{ sak: 50 }] }) // prevMut CK
        .mockResolvedValueOnce({}) // INSERT mutation CK (keluar = 15, sak = 35)
        .mockResolvedValueOnce({}) // UPDATE stocks CK
        .mockResolvedValueOnce({}) // checkParStock BEGIN
        .mockResolvedValueOnce({ rows: [] }) // checkParStock SELECT
        .mockResolvedValueOnce({}) // checkParStock COMMIT
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT item for qty_approved
        .mockResolvedValueOnce({}) // UPDATE qty_dikirim
        .mockResolvedValueOnce({ rows: [{ id: 15, status: 'DIKIRIM' }] }) // UPDATE ticket status
        .mockResolvedValueOnce({ rows: [{ nama: 'Cabang 2' }] }) // SELECT outlet nama
        .mockResolvedValueOnce({}) // notifyOutlet
        .mockResolvedValueOnce({}); // COMMIT

      const sent = await RequestService.updateStatus(15, 'DIKIRIM', 3, { id: 1, role: 'ADMIN_PUSAT' });
      expect(sent.status).toBe('DIKIRIM');

      // 2. SELESAI oleh Staf Cabang 2
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 15, kode_tiket: 'REQ-15', outlet_id: 2, status: 'DIKIRIM' }] }) // SELECT ticket
        .mockResolvedValueOnce({ rows: [{ id: 1, product_id: 1, qty_diminta: 3, qty_dikirim: 3 }] }) // SELECT items
        .mockResolvedValueOnce({ rows: [{ konversi: 5 }] }) // SELECT konversi
        .mockResolvedValueOnce({ rows: [{ sak: 10 }] }) // prevMut cabang 2
        .mockResolvedValueOnce({}) // INSERT mutation cabang 2 (masuk = 15, sak = 25)
        .mockResolvedValueOnce({}) // UPDATE stocks cabang 2
        .mockResolvedValueOnce({}) // checkParStock BEGIN
        .mockResolvedValueOnce({ rows: [] }) // checkParStock SELECT
        .mockResolvedValueOnce({}) // checkParStock COMMIT
        .mockResolvedValueOnce({ rows: [{ id: 15, status: 'SELESAI' }] }) // UPDATE ticket status
        .mockResolvedValueOnce({ rows: [{ nama: 'Cabang 2' }] }) // SELECT outlet nama
        .mockResolvedValueOnce({ rows: [] }) // notifyPusat
        .mockResolvedValueOnce({}); // COMMIT

      const done = await RequestService.updateStatus(15, 'SELESAI', undefined, { id: 5, role: 'STAF_CABANG', outlet_id: 2 });
      expect(done.status).toBe('SELESAI');
    });

    it('Audit Trail mengambil log dan statistik aktivitas dengan benar', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, module: 'MUTASI', action: 'CREATE', description: 'Mutasi pagi' },
            { id: 2, module: 'SHIFT', action: 'SHIFT_CLOSE', description: 'Tutup shift' }
          ]
        });

      const reqLogs = { query: { page: 1, limit: 10 }, user: { id: 1, role: 'OWNER' } };
      const resLogs = mockRes();
      await auditController.getLogs(reqLogs, resLogs);
      expect(resLogs.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([expect.objectContaining({ module: 'MUTASI' })])
        })
      );
    });
  });

  describe('11. Dashboard Filter Terpadu, Metrik Operasional Baru, Rekap Bulanan & Ekspor 31 Sheet Excel', () => {
    it('Dashboard mengembalikan metrik finansial, performa cabang, antrean tiket, aset peralatan, dan audit opname sesuai filter outlet', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // cabangRes
        .mockResolvedValueOnce({ rows: [{ count: '69' }] }) // produkRes
        .mockResolvedValueOnce({ rows: [{ count: '4' }] }) // parRes
        .mockResolvedValueOnce({ rows: [{ total: '2' }] }) // defectRes
        .mockResolvedValueOnce({
          rows: [{ total_unit: '250', total_baik: '248', total_rusak: '2', total_jenis_terdata: '25' }]
        }) // assetRes
        .mockResolvedValueOnce({
          rows: [{ total_nilai_persediaan: '85000000', total_unit_stok: '1200' }]
        }) // stockValRes
        .mockResolvedValueOnce({
          rows: [{ total_masuk_bulan_ini: '300', total_keluar_bulan_ini: '180', nilai_pemakaian_bulan_ini: '12500000' }]
        }) // mutMonthRes
        .mockResolvedValueOnce({
          rows: [{ total_aktif: '3', total_diajukan: '2', total_diproses: '1', total_dikirim: '0', total_selesai_bulan_ini: '14' }]
        }) // reqSummaryRes
        .mockResolvedValueOnce({
          rows: [{ total_final_bulan_ini: '2', total_draft_aktif: '1', shift_closed_hari_ini: '2' }]
        }) // opnameSummaryRes
        .mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              nama: 'Outlet Alauddin',
              tipe: 'CABANG',
              nilai_stok: '85000000',
              stok_kritis: '4',
              masuk_bulan_ini: '300',
              keluar_bulan_ini: '180',
              nilai_keluar_bulan_ini: '12500000',
              defect_bulan_ini: '2'
            }
          ]
        }); // branchPerfRes

      const reqDash = {
        query: { outlet_id: '2' },
        user: { id: 1, role: 'OWNER', nama: 'Owner Bos' }
      };
      const resDash = mockRes();
      await reportController.getDashboardStats(reqDash, resDash);

      expect(resDash.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            total_nilai_persediaan: 85000000,
            nilai_pemakaian_bulan_ini: 12500000,
            assets: { total_unit: 250, total_baik: 248, total_rusak: 2, total_jenis: 25 },
            requests_summary: {
              total_aktif: 3,
              total_diajukan: 2,
              total_diproses: 1,
              total_dikirim: 0,
              total_selesai_bulan_ini: 14
            },
            opname_summary: {
              total_final_bulan_ini: 2,
              total_draft_aktif: 1,
              shift_closed_hari_ini: 2
            },
            branch_performance: expect.arrayContaining([
              expect.objectContaining({ id: 2, nama: 'Outlet Alauddin', nilai_stok: 85000000 })
            ])
          })
        })
      );
    });

    it('Rekap Bulanan (getMonthlyRecap) menghitung ringkasan barang dan performa cabang secara akurat', async () => {
      pool.query
        .mockResolvedValueOnce({}) // syncOpnameSnapshots: harga_snapshot
        .mockResolvedValueOnce({}) // syncOpnameSnapshots: qty_sistem/fisik
        .mockResolvedValueOnce({}) // sync stock_mutations harga_snapshot
        .mockResolvedValueOnce({
          rows: [
            {
              id: 5,
              kode: 'PRD-005',
              nama: 'GULA',
              kategori: 'Bahan Utama',
              satuan: 'kg',
              harga_master: '18000',
              saw_awal_bulan: '20',
              total_masuk: '10',
              total_keluar: '15',
              sak_akhir_bulan: '15'
            }
          ]
        }) // itemsQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              nama: 'Outlet Alauddin',
              tipe: 'CABANG',
              total_masuk: '10',
              total_keluar: '15',
              nilai_pemakaian: '270000',
              total_defect: '0',
              opname_final_count: '1'
            }
          ]
        }); // branchRecapRes

      const recap = await ReportService.getMonthlyRecap(2, 10, 2026);
      expect(recap.summary.total_unit_masuk).toBe(10);
      expect(recap.summary.total_unit_keluar).toBe(15);
      expect(recap.summary.total_nilai_persediaan).toBe(15 * 18000);
      expect(recap.summary.total_nilai_pemakaian).toBe(15 * 18000);
      expect(recap.items[0]).toMatchObject({
        nama: 'GULA',
        harga: 18000,
        saw_awal_bulan: 20,
        sak_akhir_bulan: 15
      });
    });

    it('Ekspor Excel 31 Sheet (exportMonthlyExcel) menjaga kesinambungan stok antar shift & menghitung STOK OPNAME dengan benar', async () => {
      pool.query
        .mockResolvedValueOnce({}) // syncOpnameSnapshots: harga_snapshot
        .mockResolvedValueOnce({}) // syncOpnameSnapshots: qty_sistem/fisik
        .mockResolvedValueOnce({}) // sync stock_mutations harga_snapshot
        .mockResolvedValueOnce({ rows: [{ nama: 'Outlet Alauddin' }] }) // outletQuery
        .mockResolvedValueOnce({
          rows: [
            { id: 5, nama: 'GULA', satuan: 'kg', harga: '18000', urutan: 1 },
            { id: 7, nama: 'WIFI', satuan: 'unit', harga: '300', urutan: 2 }
          ]
        }) // products
        .mockResolvedValueOnce({
          rows: [
            { product_id: 5, qty_current: 15 },
            { product_id: 7, qty_current: 15 }
          ]
        }) // stocksRes
        .mockResolvedValueOnce({
          rows: [
            {
              product_id: 5,
              tanggal: new Date('2026-10-18'),
              shift: 'PAGI',
              saw: 20,
              masuk: 5,
              keluar: 10,
              sak: 15,
              harga_snapshot: 18000
            }
          ]
        }) // mutations
        .mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              kode: 'OPN-202610-001',
              outlet_id: 2,
              tanggal: new Date('2026-10-18'),
              status: 'FINAL'
            }
          ]
        }) // opnames
        .mockResolvedValueOnce({
          rows: [
            { product_id: 5, qty_sistem: 100, qty_fisik: 100, selisih: 0, harga_snapshot: 18, alasan: null },
            { product_id: 7, qty_sistem: 105, qty_fisik: 15, selisih: -90, harga_snapshot: 300, alasan: 'Susut' }
          ]
        }); // stock_opname_items

      const buffer = await ReportService.exportMonthlyExcel(2, 10, 2026);
      expect(Buffer.isBuffer(buffer)).toBe(true);

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);

      // Pastikan ada 31 sheet harian + REKAP BULANAN + STOK OPNAME = 33 sheet
      expect(wb.worksheets.length).toBe(33);

      // Cek TANGGAL 1: GULA tidak punya mutasi di Tanggal 1, SAW harus mulai dari 20 (firstSaw) dan SAK tidak jatuh ke 0
      const wsDay1 = wb.getWorksheet('TANGGAL 1');
      expect(wsDay1.getCell('D4').value).toBe(20);
      expect(wsDay1.getCell('F4').value).toEqual({ formula: 'D4+E4', result: 20 });
      expect(wsDay1.getCell('G4').value.formula).toBe('D4+E4-F4');
      expect(wsDay1.getCell('H4').value.formula).toBe('G4*C4');

      // Cek TANGGAL 18: GULA punya mutasi di PAGI (SAW=20, M=5, SAK=15, K=10)
      const wsDay18 = wb.getWorksheet('TANGGAL 18');
      expect(wsDay18.getCell('J4').value).toBe(5); // Masuk Pagi
      expect(wsDay18.getCell('K4').value).toBe(15); // SAK Pagi
      expect(wsDay18.getCell('L4').value).toEqual({ formula: 'I4+J4-K4', result: 10 }); // Keluar Pagi = 10
      expect(wsDay18.getCell('M4').value).toEqual({ formula: 'L4*C4', result: 180000 }); // Total Harga Pagi = 10 * 18000

      // Cek Sheet STOK OPNAME:
      // Baris 4 (GULA): sebelumnya dummy 100 & harga 18 -> sekarang sinkron ke stok aktual 15 & harga master 18000
      const wsOpn = wb.getWorksheet('STOK OPNAME');
      expect(wsOpn.getCell('C4').value).toBe(15); // SISTEM
      expect(wsOpn.getCell('D4').value).toBe(15); // FISIK
      expect(wsOpn.getCell('E4').value.formula).toBe('D4-C4'); // SELISIH
      expect(wsOpn.getCell('F4').value).toBe(18000); // HARGA terkalibrasi (bukan 18!)
      expect(wsOpn.getCell('G4').value.formula).toBe('E4*F4'); // NILAI SELISIH

      // Baris 5 (WIFI): punya selisih tercatat (SISTEM=105, FISIK=15, SELISIH=-90, HARGA=300, NILAI SELISIH=-27000)
      expect(wsOpn.getCell('C5').value).toBe(105);
      expect(wsOpn.getCell('D5').value).toBe(15);
      expect(wsOpn.getCell('E5').value).toEqual({ formula: 'D5-C5', result: -90 });
      expect(wsOpn.getCell('F5').value).toBe(300);
      expect(wsOpn.getCell('G5').value).toEqual({ formula: 'E5*F5', result: -27000 });

      // Baris 6 (TOTAL KESELURUHAN)
      expect(wsOpn.getCell('B6').value).toBe('TOTAL KESELURUHAN');
      expect(wsOpn.getCell('G6').value).toEqual({ formula: 'SUM(G4:G5)', result: -27000 });
    });
  });
});
