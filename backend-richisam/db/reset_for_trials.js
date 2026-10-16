const pool = require('../config/db');
const bcrypt = require('bcrypt');

async function resetForTrials() {
  const client = await pool.connect();
  try {
    console.log('🔄 Memulai Reset & Penyesuaian Data Uji Coba...');
    await client.query('BEGIN');

    // 1. Kosongkan semua data transaksi uji coba
    console.log('🧹 Mengosongkan data transaksi uji coba...');
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

    // 2. Perbarui nama-nama outlet sesuai revisi mitra (3 Outlet + Central Kitchen)
    console.log('🏢 Memperbarui nama dan diksi outlet/cabang...');
    await client.query("UPDATE outlets SET nama = 'Central Kitchen (CK)', tipe = 'PUSAT', alamat = 'Gudang & Dapur Pusat Makassar' WHERE id = 1");
    await client.query("UPDATE outlets SET nama = 'Outlet Alauddin', tipe = 'CABANG', alamat = 'Jl. Sultan Alauddin, Makassar' WHERE id = 2");
    await client.query("UPDATE outlets SET nama = 'Outlet PK3 (Perintis Kemerdekaan 3)', tipe = 'CABANG', alamat = 'Jl. Perintis Kemerdekaan KM 3, Makassar' WHERE id = 3");
    await client.query("UPDATE outlets SET nama = 'Outlet BTP', tipe = 'CABANG', alamat = 'BTP Blok M, Tamalanrea, Makassar' WHERE id = 4");

    // 3. Bersihkan akun user uji coba buatan sendiri (ID > 5)
    console.log('👥 Merapikan akun pengguna sesuai format Opsi B...');
    await client.query('DELETE FROM users WHERE id > 5');

    const defaultPassHash = await bcrypt.hash('password123', 10);

    // Update 5 user default dengan nama & username rapi sesuai Opsi B
    await client.query(
      `UPDATE users SET nama = 'Owner Bos', username = 'owner', role = 'OWNER', outlet_id = NULL, password_hash = $1, is_active = true WHERE id = 1`,
      [defaultPassHash]
    );

    await client.query(
      `UPDATE users SET nama = 'Admin Pusat', username = 'adminpusat', role = 'ADMIN_PUSAT', outlet_id = 1, password_hash = $1, is_active = true WHERE id = 2`,
      [defaultPassHash]
    );

    await client.query(
      `UPDATE users SET nama = 'Fajar (Staf Alauddin)', username = 'ald_fajar', role = 'STAF_CABANG', outlet_id = 2, password_hash = $1, is_active = true WHERE id = 3`,
      [defaultPassHash]
    );

    await client.query(
      `UPDATE users SET nama = 'Wahyu (Staf PK3)', username = 'pk3_wahyu', role = 'STAF_CABANG', outlet_id = 3, password_hash = $1, is_active = true WHERE id = 4`,
      [defaultPassHash]
    );

    await client.query(
      `UPDATE users SET nama = 'Rizal (Staf BTP)', username = 'btp_rizal', role = 'STAF_CABANG', outlet_id = 4, password_hash = $1, is_active = true WHERE id = 5`,
      [defaultPassHash]
    );

    // Tambahkan 1 akun Staf Central Kitchen sebagai contoh Opsi B
    await client.query(
      `INSERT INTO users (id, nama, username, password_hash, role, outlet_id, is_active)
       VALUES (6, 'Ahmad (Staf Central Kitchen)', 'ck_ahmad', $1, 'STAF_CABANG', 1, true)
       ON CONFLICT (id) DO UPDATE SET 
         nama = EXCLUDED.nama, 
         username = EXCLUDED.username, 
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         outlet_id = EXCLUDED.outlet_id,
         is_active = true`,
      [defaultPassHash]
    );

    // Sinkronkan sequence ID tabel users
    await client.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`);

    // 4. Reset stok fisik persediaan
    console.log('📦 Menyetel ulang stok fisik persediaan...');
    await client.query(`
      UPDATE stocks
      SET qty_current = CASE 
        WHEN o.tipe = 'PUSAT' THEN 500 
        ELSE 100 
      END
      FROM outlets o
      WHERE stocks.outlet_id = o.id
    `);

    // 5. Reset kondisi inventaris aset peralatan (semua kondisi baik)
    console.log('🔧 Mereset kondisi inventaris peralatan...');
    await client.query('UPDATE asset_stocks SET qty_baik = 10, qty_rusak = 0 WHERE 1=1');

    // 6. Catat audit log awal
    await client.query(`
      INSERT INTO audit_logs (
        user_id, user_name, role, outlet_id, outlet_name, module, 
        action, description, details, ip_address, created_at
      ) VALUES (
        1, 'Owner Bos', 'OWNER', 1, 'Central Kitchen (CK)', 'SISTEM', 
        'UPDATE', 'Database berhasil di-refresh dan dikonfigurasi ke Opsi B (3 Outlet & Central Kitchen)', 
        '{"status":"CLEAN_FOR_TRIALS"}', '127.0.0.1', CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('✅ BERHASIL: Seluruh data transaksi uji coba telah di-reset ke kondisi awal!');
    console.log('Master data produk, cabang, aset, dan akun standar Opsi B siap digunakan.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Gagal mereset data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  resetForTrials();
}

module.exports = { resetForTrials };
