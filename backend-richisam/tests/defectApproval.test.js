jest.mock('../config/db', () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock('../services/defectService', () => ({
  processDefect: jest.fn().mockResolvedValue({ id: 5, outlet_id: 2, qty: 1, status: 'DISETUJUI' }),
}));
jest.mock('../services/auditService', () => ({ logAction: jest.fn() }));

const DefectService = require('../services/defectService');
const defectController = require('../controllers/defectController');
const defectRoutes = require('../routes/defectRoutes');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const req = (role, status = 'DISETUJUI') => ({ params: { id: '5' }, body: { status }, user: { id: 9, role, outlet_id: 2 } });

describe('Persetujuan Laporan Defect (hanya Admin Pusat)', () => {
  beforeEach(() => jest.clearAllMocks());

  test.each(['OWNER', 'ADMIN_GUDANG', 'STAF_CABANG'])('%s tidak dapat memproses laporan defect', async (role) => {
    const res = mockRes();
    await defectController.processDefect(req(role), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(DefectService.processDefect).not.toHaveBeenCalled();
  });

  test.each(['DISETUJUI', 'DITOLAK'])('Admin Pusat dapat mengubah status menjadi %s', async (status) => {
    const res = mockRes();
    await defectController.processDefect(req('ADMIN_PUSAT', status), res);
    expect(DefectService.processDefect).toHaveBeenCalledWith(5, status, expect.objectContaining({ role: 'ADMIN_PUSAT' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('rute PUT /defects/:id hanya membuka akses untuk ADMIN_PUSAT', () => {
    const layer = defectRoutes.stack.find((l) => l.route && l.route.path === '/:id' && l.route.methods.put);
    const guard = layer.route.stack[0].handle;
    for (const role of ['OWNER', 'ADMIN_GUDANG', 'STAF_CABANG']) {
      const res = mockRes(); const next = jest.fn();
      guard({ user: { role } }, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    }
    const next = jest.fn();
    guard({ user: { role: 'ADMIN_PUSAT' } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
