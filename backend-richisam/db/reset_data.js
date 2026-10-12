const pool = require('../config/db');

async function resetTransactionalData() {
  const client = await pool.connect();
  try {
    console.log('🔄 Memulai Reset Data Transaksi RichiStock...');
    await client.query('BEGIN');

    // 1. Kosongkan semua tabel riwayat dan transaksi
    console.log('🧹 Mengosongkan data transaksi lama...');
    await client.query(`
      TRUNCATE TABLE 
        stock_mutations,
        restock_ticket_items,
        restock_tickets,
        defect_reports,
        branch_transfers,
        shift_closings,
        notifications,
        audit_logs,
        asset_opname_items,
        stock_opname_items,
        stock_opnames
      RESTART IDENTITY CASCADE;
    `);

    // 2. Reset stok di tabel stocks
    console.log('📦 Menyetel ulang stok fisik persediaan...');
    await client.query(`
      UPDATE stocks
      SET qty_current = CASE 
        WHEN o.tipe = 'PUSAT' THEN 500 
        ELSE 100 
      END
      FROM outlets o
      WHERE stocks.outlet_id = o.id;
    `);

    await client.query(`
      UPDATE stocks
      SET qty_current = ob.qty
      FROM opening_balances ob
      WHERE stocks.product_id = ob.product_id AND stocks.outlet_id = ob.outlet_id;
    `);

    // 3. Reset kondisi aset peralatan (semua kondisi baik)
    console.log('🔧 Mereset kondisi inventaris peralatan...');
    await client.query(`
      UPDATE asset_stocks
      SET qty_baik = 10, qty_rusak = 0
      WHERE 1=1;
    `);

    // 4. Catat 1 audit log awal untuk menandai sistem telah di-refresh
    await client.query(`
      INSERT INTO audit_logs (
        user_id, user_name, role, outlet_id, outlet_name, module, 
        action, description, details, ip_address, created_at
      ) VALUES (
        1, 'Owner Bos', 'OWNER', 1, 'Gudang Pusat Richisam', 'SYSTEM', 
        'RESET_DATABASE', 'Seluruh data transaksi berhasil di-reset untuk pengujian baru', 
        '{"status":"CLEAN"}', '127.0.0.1', CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('✅ SELURUH DATA TRANSAKSI BERHASIL DI-RESET KE KONDISI AWAL!');
    console.log('Master data produk, cabang, pengguna, dan aset tetap terjaga 100%.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Gagal mereset data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  resetTransactionalData();
}

module.exports = { resetTransactionalData };
