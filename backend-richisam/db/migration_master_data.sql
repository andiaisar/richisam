-- Migrasi Tambahan Skema: Digitalisasi Master Data Stoklist Gudang BTP (Prompt I1)
-- Jangan ubah migrasi lama (schema.sql), jalankan migrasi ini setelah schema.sql

-- 1. ALTER TABLE products
ALTER TABLE products ADD COLUMN IF NOT EXISTS urutan INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS harga NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE products ALTER COLUMN kategori TYPE VARCHAR(60);
ALTER TABLE products ADD COLUMN IF NOT EXISTS satuan_perlu_konfirmasi BOOLEAN DEFAULT true;

-- 2. ALTER TABLE stock_mutations
ALTER TABLE stock_mutations ADD COLUMN IF NOT EXISTS harga_snapshot NUMERIC(14,2);
ALTER TABLE stock_mutations ADD COLUMN IF NOT EXISTS is_opening BOOLEAN DEFAULT false;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_mutations_sak_non_negative'
    ) THEN
        ALTER TABLE stock_mutations ADD CONSTRAINT chk_mutations_sak_non_negative CHECK (sak >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_mutations_keluar_non_negative'
    ) THEN
        ALTER TABLE stock_mutations ADD CONSTRAINT chk_mutations_keluar_non_negative CHECK (keluar >= 0);
    END IF;
END $$;

-- 3. Tabel baru opening_balances
CREATE TABLE IF NOT EXISTS opening_balances (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL DEFAULT 0,
    tanggal DATE NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, outlet_id)
);

-- 4. Tabel baru assets (inventaris peralatan non-habis pakai)
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    kode VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(150) NOT NULL,
    kategori VARCHAR(60) DEFAULT 'Peralatan',
    urutan INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel baru asset_stocks
CREATE TABLE IF NOT EXISTS asset_stocks (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    qty_baik INTEGER NOT NULL DEFAULT 0,
    qty_rusak INTEGER NOT NULL DEFAULT 0,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_id, outlet_id)
);

-- 6. Tabel baru stock_opnames
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opname_status_enum') THEN
        CREATE TYPE opname_status_enum AS ENUM ('DRAFT', 'FINAL');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS stock_opnames (
    id SERIAL PRIMARY KEY,
    kode VARCHAR(50) UNIQUE NOT NULL,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    status opname_status_enum NOT NULL DEFAULT 'DRAFT',
    catatan TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    finalized_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    finalized_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel baru stock_opname_items
CREATE TABLE IF NOT EXISTS stock_opname_items (
    id SERIAL PRIMARY KEY,
    opname_id INTEGER NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty_sistem INTEGER NOT NULL DEFAULT 0,
    qty_fisik INTEGER NOT NULL DEFAULT 0,
    selisih INTEGER NOT NULL DEFAULT 0,
    harga_snapshot NUMERIC(14,2) NOT NULL DEFAULT 0,
    alasan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(opname_id, product_id)
);

-- 8. Tabel baru asset_opname_items
CREATE TABLE IF NOT EXISTS asset_opname_items (
    id SERIAL PRIMARY KEY,
    opname_id INTEGER NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    qty_sistem INTEGER NOT NULL DEFAULT 0,
    qty_fisik INTEGER NOT NULL DEFAULT 0,
    selisih INTEGER NOT NULL DEFAULT 0,
    alasan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(opname_id, asset_id)
);

-- Indexing tambahan
CREATE INDEX IF NOT EXISTS idx_opening_balances_outlet_tanggal ON opening_balances(outlet_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_stock_opnames_outlet_tanggal ON stock_opnames(outlet_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_stock_mutations_product_outlet ON stock_mutations(product_id, outlet_id);
CREATE INDEX IF NOT EXISTS idx_stocks_product_outlet ON stocks(product_id, outlet_id);
