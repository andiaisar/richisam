const MutationService = require('../services/mutationService');
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

describe('MutationService', () => {
  let client;

  beforeEach(() => {
    client = pool.connect();
    jest.clearAllMocks();
  });

  describe('Business Logic: Mutasi Stok', () => {
    it('Harus menolak jika SAK atau M negatif', async () => {
      const items = [{ product_id: 1, masuk: -10, sak: 120 }];
      await expect(
        MutationService.createMutations(1, '2023-10-10', 'PAGI', items, 1)
      ).rejects.toMatchObject({ status: 422 });
    });

    it('Harus menolak jika SAK > SAW + M (nilai Keluar menjadi negatif)', async () => {
      const items = [{ product_id: 1, masuk: 50, sak: 200 }];
      
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // exist check
        .mockResolvedValueOnce({ rows: [{ sak: 100 }] }) // prevMut
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        MutationService.createMutations(1, '2023-10-10', 'PAGI', items, 1)
      ).rejects.toMatchObject({ status: 422 });
    });

    it('Harus menghitung K = SAW + M - SAK dengan benar (SAW 100, M 50, SAK 120 -> K 30)', async () => {
      const items = [{ product_id: 1, masuk: 50, sak: 120 }];
      
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // exist check
        .mockResolvedValueOnce({ rows: [{ sak: 100 }] }) // prevMut sak = 100
        .mockResolvedValueOnce({ rows: [{ harga: 1500 }] }) // harga_snapshot = 1500
        .mockResolvedValueOnce({ rows: [] }) // insert mutation
        .mockResolvedValueOnce({ rows: [] }) // insert stock
        .mockResolvedValueOnce({}); // COMMIT
        
      await MutationService.createMutations(1, '2023-10-10', 'PAGI', items, 1);
      
      const insertCall = client.query.mock.calls.find(call => call[0].includes('INSERT INTO stock_mutations'));
      expect(insertCall).toBeDefined();
      
      const args = insertCall[1];
      expect(args[4]).toBe(100); // saw
      expect(args[5]).toBe(50);  // masuk
      expect(args[6]).toBe(30);  // keluar (100 + 50 - 120 = 30)
      expect(args[7]).toBe(120); // sak
      expect(args[8]).toBe(1500); // harga_snapshot
    });

    it('Harga snapshot harus diambil pada saat mutasi dan tidak terpengaruh jika harga master diubah nanti', async () => {
      const items = [{ product_id: 2, masuk: 0, sak: 50 }];
      
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // exist
        .mockResolvedValueOnce({ rows: [{ sak: 50 }] }) // prevMut
        .mockResolvedValueOnce({ rows: [{ harga: 1200 }] }) // current harga = 1200
        .mockResolvedValueOnce({ rows: [] }) // insert mutation
        .mockResolvedValueOnce({ rows: [] }) // insert stock
        .mockResolvedValueOnce({}); // COMMIT
        
      await MutationService.createMutations(1, '2023-10-10', 'PAGI', items, 1);
      
      const insertCall = client.query.mock.calls.find(call => call[0].includes('INSERT INTO stock_mutations'));
      expect(insertCall[1][8]).toBe(1200); // harga_snapshot = 1200
    });

    it('Rantai SAW antar shift berurutan (MIDNIGHT hari berikutnya = SORE hari sebelumnya)', () => {
      const prevShift1 = MutationService.getPreviousShift('2023-10-02', 'MIDNIGHT');
      expect(prevShift1).toEqual({ date: '2023-10-01', shift: 'SORE' });
      
      const prevShift2 = MutationService.getPreviousShift('2023-11-01', 'MIDNIGHT');
      expect(prevShift2).toEqual({ date: '2023-10-31', shift: 'SORE' });
    });
  });
});
