const pool = require('../config/db');

jest.mock('../config/db', () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock('bcrypt', () => ({ compare: jest.fn().mockResolvedValue(true) }));
jest.mock('../services/transferService', () => ({
  createTransfer: jest.fn().mockResolvedValue({ kode_transfer: 'TRF-001' }),
  approveTransfer: jest.fn().mockResolvedValue({ kode_transfer: 'TRF-001', status: 'APPROVED' }),
  rejectTransfer: jest.fn().mockResolvedValue({ kode_transfer: 'TRF-001', status: 'REJECTED' }),
}));
jest.mock('../services/auditService', () => ({ logAction: jest.fn() }));

const TransferService = require('../services/transferService');
const transferController = require('../controllers/transferController');
const transferRoutes = require('../routes/transferRoutes');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const asRole = (role, extra = {}) => ({ id: 9, role, outlet_id: 2, ...extra });

describe('Otorisasi Transfer Antar Cabang (hanya Admin Pusat)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockResolvedValue({ rows: [{ password_hash: 'hash' }] });
  });

  test.each(['OWNER', 'ADMIN_GUDANG', 'STAF_CABANG'])('%s tidak dapat menyetujui transfer', async (role) => {
    const res = mockRes();
    await transferController.approveTransfer({ params: { kode_transfer: 'TRF-001' }, user: asRole(role) }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(TransferService.approveTransfer).not.toHaveBeenCalled();
  });

  test.each(['OWNER', 'ADMIN_GUDANG', 'STAF_CABANG'])('%s tidak dapat menolak transfer', async (role) => {
    const res = mockRes();
    await transferController.rejectTransfer({ params: { kode_transfer: 'TRF-001' }, body: {}, user: asRole(role) }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(TransferService.rejectTransfer).not.toHaveBeenCalled();
  });

  test('Admin Pusat dapat menyetujui dan menolak transfer', async () => {
    const res1 = mockRes();
    await transferController.approveTransfer({ params: { kode_transfer: 'TRF-001' }, user: asRole('ADMIN_PUSAT') }, res1);
    expect(TransferService.approveTransfer).toHaveBeenCalledWith('TRF-001', expect.objectContaining({ role: 'ADMIN_PUSAT' }));
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res2 = mockRes();
    await transferController.rejectTransfer({ params: { kode_transfer: 'TRF-001' }, body: { rejection_reason: 'Stok asal menipis' }, user: asRole('ADMIN_PUSAT') }, res2);
    expect(TransferService.rejectTransfer).toHaveBeenCalledWith('TRF-001', expect.anything(), 'Stok asal menipis');
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  const body = { from_outlet_id: 2, to_outlet_id: 3, items: [{ product_id: 1, qty: 5 }], password: 'password123' };
  const createdStatus = () => TransferService.createTransfer.mock.calls[0][5];

  test.each([
    ['STAF_CABANG', 'PENDING'],
    ['OWNER', 'PENDING'],
    ['ADMIN_PUSAT', 'APPROVED'],
  ])('transfer yang dibuat oleh %s berstatus %s', async (role, status) => {
    const res = mockRes();
    await transferController.createTransfer({ body, user: asRole(role) }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(createdStatus()).toBe(status);
  });

  test('rute approve/reject hanya membuka akses untuk ADMIN_PUSAT', () => {
    const guards = transferRoutes.stack
      .filter((l) => l.route && /approve|reject/.test(l.route.path))
      .map((l) => l.route.stack[0].handle);
    expect(guards).toHaveLength(2);
    for (const guard of guards) {
      for (const role of ['OWNER', 'ADMIN_GUDANG', 'STAF_CABANG']) {
        const res = mockRes(); const next = jest.fn();
        guard({ user: { role } }, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
      }
      const next = jest.fn();
      guard({ user: { role: 'ADMIN_PUSAT' } }, mockRes(), next);
      expect(next).toHaveBeenCalled();
    }
  });
});
