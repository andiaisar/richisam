const pool = require('../config/db');

jest.mock('../config/db', () => {
  const mClient = { query: jest.fn(), release: jest.fn() };
  return { connect: jest.fn(() => mClient), query: jest.fn() };
});

const mutationController = require('../controllers/mutationController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Stok Awal (Opening Balance)', () => {
  let client;

  beforeEach(() => {
    jest.clearAllMocks();
    client = pool.connect();
    client.query.mockResolvedValue({ rows: [] });
  });

  const req = (body) => ({ body, user: { id: 7 } });
  const upsertCall = () => client.query.mock.calls.find(([sql]) => /INSERT INTO opening_balances/.test(sql));

  test('menyimpan tanggal stok awal sesuai pilihan pengguna', async () => {
    const res = mockRes();
    await mutationController.createOpeningBalances(
      req({ outlet_id: 2, tanggal: '2026-11-01', items: [{ product_id: 1, qty: 10 }] }), res
    );
    expect(res.status).toHaveBeenCalledWith(201);
    const [sql, params] = upsertCall();
    expect(sql).toMatch(/COALESCE\(\$5::date, CURRENT_DATE\)/);
    expect(sql).toMatch(/tanggal = EXCLUDED\.tanggal/);
    expect(params[4]).toBe('2026-11-01');
  });

  test('memakai tanggal hari ini bila tanggal tidak dikirim', async () => {
    const res = mockRes();
    await mutationController.createOpeningBalances(req({ outlet_id: 2, items: [{ product_id: 1, qty: 5 }] }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(upsertCall()[1][4]).toBeNull();
  });

  test('menolak format tanggal yang tidak valid', async () => {
    const res = mockRes();
    await mutationController.createOpeningBalances(
      req({ outlet_id: 2, tanggal: '2026-02-30', items: [{ product_id: 1, qty: 5 }] }), res
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(upsertCall()).toBeUndefined();
  });

  test('GET mengembalikan tanggal sebagai string YYYY-MM-DD', async () => {
    pool.query.mockResolvedValue({ rows: [{ product_id: 1, qty: 10, tanggal: '2026-11-01' }] });
    const res = mockRes();
    await mutationController.getOpeningBalances({ query: { outlet_id: '2' } }, res);
    expect(pool.query.mock.calls[0][0]).toMatch(/to_char\(ob\.tanggal, 'YYYY-MM-DD'\) AS tanggal/);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ product_id: 1, qty: 10, tanggal: '2026-11-01' }] });
  });
});
