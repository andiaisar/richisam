const OpnameService = require('../services/opnameService');
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

describe('OpnameService', () => {
  let client;

  beforeEach(() => {
    client = pool.connect();
    jest.clearAllMocks();
  });

  describe('updateOpnameItems', () => {
    it('Harus menolak edit jika opname sudah FINAL', async () => {
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ status: 'FINAL' }] }) // check status
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        OpnameService.updateOpnameItems(1, [{ product_id: 1, qty_fisik: 10 }])
      ).rejects.toThrow('Opname FINAL tidak bisa diedit');
    });

    it('Selisih dihitung benar (qty_fisik - qty_sistem)', async () => {
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ status: 'DRAFT' }] }) // check status
        .mockResolvedValueOnce({ rows: [{ qty_sistem: 15 }] }) // get sys qty
        .mockResolvedValueOnce({}) // update stock_opname_items
        .mockResolvedValueOnce({}); // COMMIT

      await OpnameService.updateOpnameItems(1, [{ product_id: 1, qty_fisik: 10, alasan: 'Hilang' }]);
      
      const updateCall = client.query.mock.calls.find(c => c[0].includes('UPDATE stock_opname_items'));
      expect(updateCall).toBeDefined();
      // selisih = 10 - 15 = -5
      expect(updateCall[1][1]).toBe(-5); 
    });
  });

  describe('finalizeOpname', () => {
    it('Harus menolak jika opname sudah FINAL', async () => {
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ status: 'FINAL' }] }) // check status
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        OpnameService.finalizeOpname(1, false, 1)
      ).rejects.toThrow('Opname FINAL tidak bisa diedit');
    });

    it('Harus mengubah stok jika apply_adjustment = true', async () => {
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ outlet_id: 1, status: 'DRAFT' }] }) // opname
        .mockResolvedValueOnce({ rows: [{ product_id: 1, qty_fisik: 20, selisih: -5, alasan: 'X' }] }) // items
        .mockResolvedValueOnce({ rows: [] }) // asset items
        .mockResolvedValueOnce({}) // update stocks
        .mockResolvedValueOnce({}) // update status
        .mockResolvedValueOnce({}); // COMMIT

      await OpnameService.finalizeOpname(1, true, 1);
      
      const updateStockCall = client.query.mock.calls.find(c => c[0].includes('UPDATE stocks SET qty_current'));
      expect(updateStockCall).toBeDefined();
      // qty_fisik
      expect(updateStockCall[1][0]).toBe(20);
    });

    it('TIDAK mengubah stok jika apply_adjustment = false', async () => {
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ outlet_id: 1, status: 'DRAFT' }] }) // opname
        .mockResolvedValueOnce({ rows: [{ product_id: 1, qty_fisik: 20, selisih: -5, alasan: 'X' }] }) // items
        .mockResolvedValueOnce({ rows: [] }) // asset items
        .mockResolvedValueOnce({}) // update status
        .mockResolvedValueOnce({}); // COMMIT

      await OpnameService.finalizeOpname(1, false, 1);
      
      const updateStockCall = client.query.mock.calls.find(c => c[0].includes('UPDATE stocks SET qty_current'));
      expect(updateStockCall).toBeUndefined(); // tidak boleh dipanggil
    });
  });
});
