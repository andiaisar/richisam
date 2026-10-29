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
});
