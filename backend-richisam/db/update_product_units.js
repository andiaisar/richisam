const pool = require('../config/db');

const productDefinitions = [
  { kode: 'PRD-001', nama: 'AYAM MARINASI 1 EKOR', satuan: 'ekor', satuan_besar: 'ekor', konversi: 1, harga: 34123.00 },
  { kode: 'PRD-002', nama: 'AYAM MARINASI POTONG', satuan: 'potong', satuan_besar: 'pack', konversi: 10, harga: 5390.00 },
  { kode: 'PRD-003', nama: 'BERAS', satuan: 'kg', satuan_besar: 'karung', konversi: 25, harga: 25000.00 },
  { kode: 'PRD-004', nama: 'TEH', satuan: 'pack', satuan_besar: 'dus', konversi: 24, harga: 5800.00 },
  { kode: 'PRD-005', nama: 'GULA', satuan: 'kg', satuan_besar: 'karung', konversi: 50, harga: 18000.00 },
  { kode: 'PRD-006', nama: 'GAS', satuan: 'tabung', satuan_besar: 'tabung', konversi: 1, harga: 20000.00 },
  { kode: 'QWE',     nama: 'WIFI', satuan: 'unit', satuan_besar: 'unit', konversi: 1, harga: 300.00 },
  { kode: 'PRD-007', nama: 'KEJU SLICE', satuan: 'slice', satuan_besar: 'pack', konversi: 20, harga: 992.00 },
  { kode: 'PRD-008', nama: 'KENTANG', satuan: 'pack', satuan_besar: 'dus', konversi: 10, harga: 3091.00 },
  { kode: 'PRD-009', nama: 'LOMBOK BIJI', satuan: 'kg', satuan_besar: 'kg', konversi: 1, harga: 35000.00 },
  { kode: 'PRD-010', nama: 'BAWANG PUTIH', satuan: 'kg', satuan_besar: 'kg', konversi: 1, harga: 36000.00 },
  { kode: 'PRD-011', nama: 'MINYAK', satuan: 'liter', satuan_besar: 'jerigen', konversi: 18, harga: 17000.00 },
  { kode: 'PRD-012', nama: 'GALON', satuan: 'galon', satuan_besar: 'galon', konversi: 1, harga: 6000.00 },
  { kode: 'PRD-013', nama: 'PLASTIK SAMPAH', satuan: 'pack', satuan_besar: 'dus', konversi: 20, harga: 13000.00 },
  { kode: 'PRD-014', nama: 'ROTI BURGER', satuan: 'pcs', satuan_besar: 'pack', konversi: 10, harga: 2000.00 },
  { kode: 'PRD-015', nama: 'SAMBAL MATAH', satuan: 'gram', satuan_besar: 'kg', konversi: 1000, harga: 28.00 },
  { kode: 'PRD-016', nama: 'SAMBAL RICA', satuan: 'gram', satuan_besar: 'kg', konversi: 1000, harga: 45.00 },
  { kode: 'PRD-017', nama: 'SAMBAL RICHIS', satuan: 'gram', satuan_besar: 'kg', konversi: 1000, harga: 27.00 },
  { kode: 'PRD-018', nama: 'SAMBAL BAWANG', satuan: 'gram', satuan_besar: 'kg', konversi: 1000, harga: 32.00 },
  { kode: 'PRD-019', nama: 'SAUCE RICHISAM', satuan: 'gram', satuan_besar: 'kg', konversi: 1000, harga: 28.56 },
  { kode: 'PRD-020', nama: 'SAUCE KEJU', satuan: 'gram', satuan_besar: 'kg', konversi: 1000, harga: 54.00 },
  { kode: 'PRD-021', nama: 'SAUCE ORIGINAL', satuan: 'gram', satuan_besar: 'kg', konversi: 1000, harga: 18.00 },
  { kode: 'PRD-022', nama: 'SAUCE BBQ', satuan: 'botol', satuan_besar: 'dus', konversi: 12, harga: 4316.00 },
  { kode: 'PRD-023', nama: 'TEPUNG KRISPY', satuan: 'pack', satuan_besar: 'sak', konversi: 5, harga: 60410.00 },
  { kode: 'PRD-024', nama: 'SABUN CUCI PIRING', satuan: 'pouch', satuan_besar: 'dus', konversi: 12, harga: 12000.00 },
  { kode: 'PRD-025', nama: 'FROZEN AYAM UNGKEP ISI 4', satuan: 'pack', satuan_besar: 'pack', konversi: 1, harga: 35263.00 },
  { kode: 'PRD-026', nama: 'FROZEN AYAM UNGKEP ISI 8', satuan: 'pack', satuan_besar: 'pack', konversi: 1, harga: 40949.00 },
  { kode: 'PRD-027', nama: 'CUP SAMBAL T.A', satuan: 'pcs', satuan_besar: 'slop', konversi: 50, harga: 90.00 },
  { kode: 'PRD-028', nama: 'CUP SAMBAL DINE IN', satuan: 'pcs', satuan_besar: 'slop', konversi: 50, harga: 186.00 },
  { kode: 'PRD-029', nama: 'KERTAS KENTANG', satuan: 'lembar', satuan_besar: 'pack', konversi: 100, harga: 370.00 },
  { kode: 'PRD-030', nama: 'KERTAS NASI PUTIH', satuan: 'lembar', satuan_besar: 'pack', konversi: 100, harga: 75.00 },
  { kode: 'PRD-031', nama: 'MENTEGA', satuan: 'pack', satuan_besar: 'dus', konversi: 12, harga: 5500.00 },
  { kode: 'PRD-032', nama: 'PELAPIS NASI COKLAT', satuan: 'lembar', satuan_besar: 'pack', konversi: 100, harga: 72.00 },
  { kode: 'PRD-033', nama: 'PLASTIK TANGAN', satuan: 'pack', satuan_besar: 'dus', konversi: 10, harga: 5417.00 },
  { kode: 'PRD-034', nama: 'SAUCE TOMAT SACHET', satuan: 'pack', satuan_besar: 'dus', konversi: 10, harga: 5020.00 },
  { kode: 'PRD-035', nama: 'SAUCE SAMBAL SACHET', satuan: 'pack', satuan_besar: 'dus', konversi: 10, harga: 5140.00 },
  { kode: 'PRD-036', nama: 'SELOTIP', satuan: 'roll', satuan_besar: 'slop', konversi: 6, harga: 8000.00 },
  { kode: 'PRD-037', nama: 'INDOMIE GORENG', satuan: 'bungkus', satuan_besar: 'dus', konversi: 40, harga: 2950.00 },
  { kode: 'PRD-038', nama: 'BUMBU KENTANG', satuan: 'pack', satuan_besar: 'dus', konversi: 10, harga: 4000.00 },
  { kode: 'PRD-039', nama: 'BAYAM GORENG', satuan: 'porsi', satuan_besar: 'porsi', konversi: 1, harga: 112.60 },
  { kode: 'PRD-040', nama: 'AIR MINERAL', satuan: 'botol', satuan_besar: 'dus', konversi: 24, harga: 1458.00 },
  { kode: 'PRD-041', nama: 'LOYALTI CARD', satuan: 'lembar', satuan_besar: 'pack', konversi: 100, harga: 500.00 },
  { kode: 'PRD-042', nama: 'KERTAS THERMAL', satuan: 'roll', satuan_besar: 'dus', konversi: 50, harga: 4700.00 },
  { kode: 'PRD-043', nama: 'TISSU MEJA', satuan: 'pack', satuan_besar: 'dus', konversi: 24, harga: 2791.00 },
  { kode: 'PRD-044', nama: 'TISSU HAND TOWEL', satuan: 'pack', satuan_besar: 'dus', konversi: 20, harga: 7400.00 },
  { kode: 'PRD-045', nama: 'SABUN LANTAI', satuan: 'pouch', satuan_besar: 'dus', konversi: 12, harga: 12000.00 },
  { kode: 'PRD-046', nama: 'GARPU SENDOK PLASTIK', satuan: 'pcs', satuan_besar: 'pack', konversi: 50, harga: 400.00 },
  { kode: 'PRD-047', nama: 'GELAS TAKE AWAY', satuan: 'pcs', satuan_besar: 'slop', konversi: 50, harga: 700.00 },
  { kode: 'PRD-048', nama: 'GELAS TA LARGE', satuan: 'pcs', satuan_besar: 'slop', konversi: 50, harga: 700.00 },
  { kode: 'PRD-049', nama: 'KECAP', satuan: 'pouch', satuan_besar: 'dus', konversi: 12, harga: 22000.00 },
  { kode: 'PRD-050', nama: 'KEMASAN ALA CARTE', satuan: 'pcs', satuan_besar: 'pack', konversi: 100, harga: 800.00 },
  { kode: 'PRD-051', nama: 'KEMASAN BESAR', satuan: 'pcs', satuan_besar: 'pack', konversi: 100, harga: 700.00 },
  { kode: 'PRD-052', nama: 'MANGGO SYRUP', satuan: 'botol', satuan_besar: 'dus', konversi: 6, harga: 11400.00 },
  { kode: 'PRD-053', nama: 'ORANGE SYRUP', satuan: 'botol', satuan_besar: 'dus', konversi: 6, harga: 11400.00 },
  { kode: 'PRD-054', nama: 'SIRUP LEMON', satuan: 'botol', satuan_besar: 'dus', konversi: 6, harga: 21800.00 },
  { kode: 'PRD-055', nama: 'PIPET NO STERIL', satuan: 'pack', satuan_besar: 'dus', konversi: 20, harga: 13000.00 },
  { kode: 'PRD-056', nama: 'PIPET STERIL', satuan: 'pack', satuan_besar: 'dus', konversi: 20, harga: 25000.00 },
  { kode: 'PRD-057', nama: 'PLASTIK BESAR 28', satuan: 'pack', satuan_besar: 'bal', konversi: 10, harga: 11385.00 },
  { kode: 'PRD-058', nama: 'PLASTIK BESAR 35', satuan: 'pack', satuan_besar: 'bal', konversi: 10, harga: 15840.00 },
  { kode: 'PRD-059', nama: 'PLASTIK SEDANG 24', satuan: 'pack', satuan_besar: 'bal', konversi: 10, harga: 8778.00 },
  { kode: 'PRD-060', nama: 'PLASTIK KECIL15', satuan: 'pack', satuan_besar: 'bal', konversi: 10, harga: 4719.00 },
  { kode: 'PRD-061', nama: 'PLASTIK CUP SEAL', satuan: 'roll', satuan_besar: 'dus', konversi: 6, harga: 94050.00 },
  { kode: 'PRD-062', nama: 'BUAH LEMON', satuan: 'kg', satuan_besar: 'kg', konversi: 1, harga: 9285.00 },
  { kode: 'PRD-063', nama: 'SPRITE', satuan: 'botol', satuan_besar: 'dus', konversi: 12, harga: 11300.00 },
  { kode: 'PRD-064', nama: 'SABUN CUCI TANGAN', satuan: 'botol', satuan_besar: 'dus', konversi: 12, harga: 15000.00 },
  { kode: 'PRD-065', nama: 'BIJI SELASIH', satuan: 'pack', satuan_besar: 'dus', konversi: 10, harga: 3630.00 },
  { kode: 'PRD-066', nama: 'NUTRISARI ANGGUR', satuan: 'sachet', satuan_besar: 'renceng', konversi: 10, harga: 1300.00 },
  { kode: 'PRD-067', nama: 'SAUCE PILLOW', satuan: 'pouch', satuan_besar: 'dus', konversi: 10, harga: 12000.00 },
  { kode: 'PRD-068', nama: 'KEMASAN HOOK', satuan: 'pcs', satuan_besar: 'pack', konversi: 100, harga: 2300.00 }
];

async function updateAllProductUnits() {
  const client = await pool.connect();
  try {
    console.log('🔄 Memulai Pembaruan Satuan Produk...');
    await client.query('BEGIN');

    let updatedCount = 0;
    for (const p of productDefinitions) {
      const res = await client.query(
        `UPDATE products 
         SET satuan = $1, 
             satuan_besar = $2, 
             konversi = $3, 
             harga = $4,
             satuan_perlu_konfirmasi = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE kode = $5
         RETURNING id, kode, nama, satuan, satuan_besar, konversi`,
        [p.satuan, p.satuan_besar, p.konversi, p.harga, p.kode]
      );
      if (res.rowCount > 0) {
        updatedCount++;
      }
    }

    console.log(`✅ Berhasil memperbarui satuan untuk ${updatedCount} produk!`);

    // Penyesuaian nilai stok & opening balance untuk item yang sebelumnya terdampak input dummy "gram"
    // 1. BERAS (id 8): 125000 gram -> 125 kg (5 karung @ 25 kg)
    await client.query(`
      UPDATE stocks SET qty_current = 125 WHERE product_id = 8 AND qty_current = 125000;
      UPDATE opening_balances SET qty = 125 WHERE product_id = 8 AND qty = 125000;
    `);

    // 2. LOMBOK BIJI (id 14): 3000 gram -> 3 kg
    await client.query(`
      UPDATE stocks SET qty_current = 3 WHERE product_id = 14 AND qty_current = 3000;
      UPDATE opening_balances SET qty = 3 WHERE product_id = 14 AND qty = 3000;
    `);

    // 3. SABUN CUCI PIRING (id 29): 3000 gram -> 5 pouch
    await client.query(`
      UPDATE stocks SET qty_current = 5 WHERE product_id = 29 AND qty_current = 3000;
      UPDATE opening_balances SET qty = 5 WHERE product_id = 29 AND qty = 3000;
    `);

    // 4. SELOTIP (id 41): 3000 gram -> 5 roll
    await client.query(`
      UPDATE stocks SET qty_current = 5 WHERE product_id = 41 AND qty_current = 3000;
      UPDATE opening_balances SET qty = 5 WHERE product_id = 41 AND qty = 3000;
    `);

    // 5. LOYALTI CARD (id 46): 3000 gram -> 100 lembar
    await client.query(`
      UPDATE stocks SET qty_current = 100 WHERE product_id = 46 AND qty_current = 3000;
      UPDATE opening_balances SET qty = 100 WHERE product_id = 46 AND qty = 3000;
    `);

    // 6. SABUN LANTAI (id 50): 3000 gram -> 5 pouch
    await client.query(`
      UPDATE stocks SET qty_current = 5 WHERE product_id = 50 AND qty_current = 3000;
      UPDATE opening_balances SET qty = 5 WHERE product_id = 50 AND qty = 3000;
    `);

    // 7. SABUN CUCI TANGAN (id 69): 3000 gram -> 5 botol
    await client.query(`
      UPDATE stocks SET qty_current = 5 WHERE product_id = 69 AND qty_current = 3000;
      UPDATE opening_balances SET qty = 5 WHERE product_id = 69 AND qty = 3000;
    `);

    // 8. SAUCE PILLOW (id 72): 3000 gram -> 5 pouch
    await client.query(`
      UPDATE stocks SET qty_current = 5 WHERE product_id = 72 AND qty_current = 3000;
      UPDATE opening_balances SET qty = 5 WHERE product_id = 72 AND qty = 3000;
    `);

    // 9. CUP SAMBAL T.A (id 32): 3000 gram -> 300 pcs
    await client.query(`
      UPDATE stocks SET qty_current = 300 WHERE product_id = 32 AND qty_current = 3000;
      UPDATE opening_balances SET qty = 300 WHERE product_id = 32 AND qty = 3000;
    `);

    // 10. PLASTIK SAMPAH (id 18): 300 gram -> 30 pack
    await client.query(`
      UPDATE stocks SET qty_current = 30 WHERE product_id = 18 AND qty_current = 300;
      UPDATE opening_balances SET qty = 30 WHERE product_id = 18 AND qty = 300;
    `);

    // 11. KECAP (id 54): 3000 gram -> 5 pouch
    await client.query(`
      UPDATE stocks SET qty_current = 5 WHERE product_id = 54 AND qty_current = 3000;
      UPDATE opening_balances SET qty = 5 WHERE product_id = 54 AND qty = 3000;
    `);

    await client.query('COMMIT');
    console.log('🎉 Transaksi migrasi satuan dan penyesuaian stok BERHASIL!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Gagal memperbarui satuan produk:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

updateAllProductUnits();
