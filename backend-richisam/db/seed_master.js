const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const pool = require('../config/db');

async function runSeedMaster() {
  const client = await pool.connect();

  try {
    console.log('🚀 Memulai Seeding Master Data...');
    await client.query('BEGIN');

    // Hapus data dummy lama dari Fase 1 jika ada (PRD001 - PRD005)
    await client.query("DELETE FROM products WHERE kode IN ('PRD001', 'PRD002', 'PRD003', 'PRD004', 'PRD005')");

    // 1. Tentukan path file CSV
    const productsCsvPath = [
      path.join(__dirname, 'seeds/data/master_products.csv'),
      path.join(__dirname, 'seeds/master_products.csv'),
      path.join(__dirname, '../../master_products.csv')
    ].find(p => fs.existsSync(p));

    const assetsCsvPath = [
      path.join(__dirname, 'seeds/data/master_assets.csv'),
      path.join(__dirname, 'seeds/master_assets.csv'),
      path.join(__dirname, '../../master_assets.csv')
    ].find(p => fs.existsSync(p));

    if (!productsCsvPath || !assetsCsvPath) {
      throw new Error(`File CSV tidak ditemukan! Pastikan master_products.csv dan master_assets.csv tersedia.`);
    }

    console.log(`📂 Membaca file produk dari: ${productsCsvPath}`);
    console.log(`📂 Membaca file aset dari: ${assetsCsvPath}`);

    // 2. Parse file CSV
    const productsCsvContent = fs.readFileSync(productsCsvPath, 'utf-8');
    const productsRows = parse(productsCsvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const assetsCsvContent = fs.readFileSync(assetsCsvPath, 'utf-8');
    const assetsRows = parse(assetsCsvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    // 3. Upsert Products
    let productsCreated = 0;
    let productsUpdated = 0;
    const zeroPriceProducts = [];
    let needConfirmSatuanCount = 0;
    const activeProductIds = [];

    for (const row of productsRows) {
      const urutan = parseInt(row.urutan, 10);
      const kode = `PRD-${String(urutan).padStart(3, '0')}`;
      
      // Rapikan nama: trim spasi ganda, perbaiki PELASTIK -> PLASTIK, jadikan UPPERCASE konsisten
      const cleanName = row.nama
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/pelastik/gi, 'PLASTIK')
        .toUpperCase();

      const harga = parseFloat(row.harga || 0);
      const kategori = row.kategori_usulan ? row.kategori_usulan.trim() : 'Lainnya';
      
      // Aturan satuan: harga < 100 -> gram, lainnya -> pcs, konfirmasi = true
      const satuan = harga < 100 ? 'gram' : 'pcs';
      const satuanPerluKonfirmasi = true;

      if (harga === 0) {
        zeroPriceProducts.push({ kode, nama: cleanName });
      }
      if (satuanPerluKonfirmasi) {
        needConfirmSatuanCount++;
      }

      const res = await client.query(
        `INSERT INTO products (kode, nama, harga, kategori, urutan, satuan, satuan_perlu_konfirmasi, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (kode) DO UPDATE SET
           nama = EXCLUDED.nama,
           harga = EXCLUDED.harga,
           kategori = EXCLUDED.kategori,
           urutan = EXCLUDED.urutan,
           satuan = EXCLUDED.satuan,
           satuan_perlu_konfirmasi = EXCLUDED.satuan_perlu_konfirmasi,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, (xmax = 0) AS is_inserted`,
        [kode, cleanName, harga, kategori, urutan, satuan, satuanPerluKonfirmasi]
      );

      if (res.rows[0].is_inserted) {
        productsCreated++;
      } else {
        productsUpdated++;
      }

      activeProductIds.push(res.rows[0].id);
    }

    // 4. Cari Outlet Gudang Pusat & Semua Outlet
    const pusatRes = await client.query("SELECT id FROM outlets WHERE tipe = 'PUSAT' LIMIT 1");
    if (pusatRes.rows.length === 0) {
      throw new Error("Outlet Gudang Pusat ('PUSAT') tidak ditemukan di database.");
    }
    const pusatOutletId = pusatRes.rows[0].id;

    const allOutletsRes = await client.query("SELECT id FROM outlets WHERE is_active = true");
    const allOutletIds = allOutletsRes.rows.map(r => r.id);

    // 5. Upsert Assets & Asset Stocks (Gudang Pusat)
    let assetsCreated = 0;
    let assetsUpdated = 0;

    for (const row of assetsRows) {
      const urutan = parseInt(row.urutan, 10);
      const kode = `AST-${String(urutan).padStart(3, '0')}`;
      const cleanName = row.nama.replace(/\s+/g, ' ').trim();
      const kategori = 'Peralatan';
      const qtyGudang = parseInt(row.qty_gudang || 0, 10);

      const res = await client.query(
        `INSERT INTO assets (kode, nama, kategori, urutan, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (kode) DO UPDATE SET
           nama = EXCLUDED.nama,
           kategori = EXCLUDED.kategori,
           urutan = EXCLUDED.urutan,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, (xmax = 0) AS is_inserted`,
        [kode, cleanName, kategori, urutan]
      );

      const assetId = res.rows[0].id;
      if (res.rows[0].is_inserted) {
        assetsCreated++;
      } else {
        assetsUpdated++;
      }

      // Buat asset_stocks untuk Gudang Pusat dengan qty_baik dari qty_gudang
      await client.query(
        `INSERT INTO asset_stocks (asset_id, outlet_id, qty_baik, qty_rusak)
         VALUES ($1, $2, $3, 0)
         ON CONFLICT (asset_id, outlet_id) DO UPDATE SET
           qty_baik = EXCLUDED.qty_baik,
           updated_at = CURRENT_TIMESTAMP`,
        [assetId, pusatOutletId, qtyGudang]
      );
    }

    // 6. Inisialisasi stocks (qty 0) untuk setiap produk aktif di Gudang Pusat dan semua cabang (jangan menimpa)
    for (const productId of activeProductIds) {
      for (const outletId of allOutletIds) {
        await client.query(
          `INSERT INTO stocks (product_id, outlet_id, qty_current)
           VALUES ($1, $2, 0)
           ON CONFLICT (product_id, outlet_id) DO NOTHING`,
          [productId, outletId]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Transaksi Seeding Master Data BERHASIL di-commit!');

    // 7. Cetak Ringkasan
    console.log('\n================ RINGKASAN SEEDING ================');
    console.log(`📦 Produk dibuat/baru     : ${productsCreated}`);
    console.log(`📦 Produk diperbarui      : ${productsUpdated}`);
    console.log(`📦 Total Produk Aktif     : ${activeProductIds.length}`);
    console.log(`🔧 Aset dibuat/baru       : ${assetsCreated}`);
    console.log(`🔧 Aset diperbarui        : ${assetsUpdated}`);
    console.log(`🔧 Total Aset             : ${assetsRows.length}`);
    console.log(`⚠️ Produk berharga 0      : ${zeroPriceProducts.length} (${zeroPriceProducts.map(p => `${p.kode}: ${p.nama}`).join(', ')})`);
    console.log(`❓ Satuan perlu konfirmasi: ${needConfirmSatuanCount}`);
    console.log('===================================================\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error saat menjalankan seed master data:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeedMaster();
