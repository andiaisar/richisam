-- ════════════════════════════════════════════════════════════════════
-- RICHISTOCK — SKEMA DATABASE LENGKAP UNTUK SUPABASE POSTGRESQL
-- Eksekusi file ini langsung di SQL Editor Supabase
-- ════════════════════════════════════════════════════════════════════

-- 1. DROP EXISTING TABLES (JIKA INGIN RESET)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS shift_closings CASCADE;
DROP TABLE IF EXISTS branch_transfers CASCADE;
DROP TABLE IF EXISTS product_batches CASCADE;
DROP TABLE IF EXISTS asset_opname_items CASCADE;
DROP TABLE IF EXISTS stock_opname_items CASCADE;
DROP TABLE IF EXISTS stock_opnames CASCADE;
DROP TABLE IF EXISTS asset_stocks CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS opening_balances CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS defect_reports CASCADE;
DROP TABLE IF EXISTS restock_ticket_items CASCADE;
DROP TABLE IF EXISTS restock_tickets CASCADE;
DROP TABLE IF EXISTS stock_mutations CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS par_stocks CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS outlets CASCADE;

-- 2. ENUM TYPES
DROP TYPE IF EXISTS outlet_tipe_enum CASCADE;
DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS shift_enum CASCADE;
DROP TYPE IF EXISTS sumber_masuk_enum CASCADE;
DROP TYPE IF EXISTS ticket_status_enum CASCADE;
DROP TYPE IF EXISTS defect_status_enum CASCADE;
DROP TYPE IF EXISTS notif_tipe_enum CASCADE;
DROP TYPE IF EXISTS opname_status_enum CASCADE;

CREATE TYPE outlet_tipe_enum AS ENUM ('PUSAT', 'CABANG');
CREATE TYPE user_role_enum AS ENUM ('OWNER', 'ADMIN_PUSAT', 'STAF_CABANG', 'ADMIN_GUDANG');
CREATE TYPE shift_enum AS ENUM ('MIDNIGHT', 'PAGI', 'SORE');
CREATE TYPE sumber_masuk_enum AS ENUM ('MANUAL', 'TIKET', 'TRANSFER', 'IMPORT');
CREATE TYPE ticket_status_enum AS ENUM ('DIAJUKAN', 'DIPROSES', 'DIKIRIM', 'SELESAI');
CREATE TYPE defect_status_enum AS ENUM ('BARU', 'DITINJAU', 'SELESAI', 'DISETUJUI', 'DITOLAK', 'PENDING');
CREATE TYPE notif_tipe_enum AS ENUM ('PAR_STOCK', 'TIKET', 'DEFECT', 'KADALUARSA');
CREATE TYPE opname_status_enum AS ENUM ('DRAFT', 'FINAL');

-- 3. TABEL OUTLETS
CREATE TABLE outlets (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    tipe outlet_tipe_enum NOT NULL,
    alamat TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABEL USERS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL,
    outlet_id INTEGER REFERENCES outlets(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABEL PRODUCTS (BAHAN BAKU & PACKAGING)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    kode VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    satuan VARCHAR(20) NOT NULL,
    satuan_besar VARCHAR(50),
    konversi INTEGER DEFAULT 1,
    kategori VARCHAR(60) DEFAULT 'Bahan Baku',
    harga NUMERIC(14,0) NOT NULL DEFAULT 0,
    urutan INTEGER,
    satuan_perlu_konfirmasi BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABEL PAR_STOCKS
CREATE TABLE par_stocks (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    min_qty INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, outlet_id)
);

-- 7. TABEL STOCKS (SALDO FISIK BERJALAN)
CREATE TABLE stocks (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    qty_current INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, outlet_id)
);

-- 8. TABEL STOCK_MUTATIONS
CREATE TABLE stock_mutations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    shift shift_enum NOT NULL,
    sak INTEGER DEFAULT 0,
    masuk INTEGER DEFAULT 0,
    keluar INTEGER DEFAULT 0,
    sisa INTEGER NOT NULL,
    sumber_masuk sumber_masuk_enum,
    keterangan TEXT,
    harga_snapshot NUMERIC(14,0),
    is_opening BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABEL RESTOCK_TICKETS & ITEMS
CREATE TABLE restock_tickets (
    id SERIAL PRIMARY KEY,
    nomor_tiket VARCHAR(50) UNIQUE NOT NULL,
    kode_tiket VARCHAR(50),
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    status ticket_status_enum DEFAULT 'DIAJUKAN',
    catatan TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP,
    received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    received_at TIMESTAMP,
    ada_selisih BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE restock_ticket_items (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES restock_tickets(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty_diminta INTEGER NOT NULL,
    qty_disetujui INTEGER,
    qty_dikirim INTEGER DEFAULT 0,
    qty_diterima INTEGER DEFAULT 0,
    catatan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABEL DEFECT_REPORTS
CREATE TABLE defect_reports (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL,
    foto_url VARCHAR(255),
    keterangan TEXT,
    deskripsi TEXT,
    alasan TEXT,
    action VARCHAR(50) DEFAULT 'RETUR',
    status defect_status_enum DEFAULT 'BARU',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    batch_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABEL NOTIFICATIONS
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    outlet_id INTEGER REFERENCES outlets(id) ON DELETE CASCADE,
    tipe notif_tipe_enum NOT NULL,
    pesan TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    reference_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. TABEL OPENING_BALANCES
CREATE TABLE opening_balances (
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

-- 13. TABEL ASSETS & ASSET_STOCKS
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    kode VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(150) NOT NULL,
    kategori VARCHAR(60) DEFAULT 'Peralatan',
    urutan INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asset_stocks (
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

-- 14. TABEL STOCK_OPNAMES & OPNAME_ITEMS
CREATE TABLE stock_opnames (
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

CREATE TABLE stock_opname_items (
    id SERIAL PRIMARY KEY,
    opname_id INTEGER NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty_sistem INTEGER NOT NULL DEFAULT 0,
    qty_fisik INTEGER NOT NULL DEFAULT 0,
    selisih INTEGER NOT NULL DEFAULT 0,
    harga_snapshot NUMERIC(14,0) NOT NULL DEFAULT 0,
    alasan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(opname_id, product_id)
);

CREATE TABLE asset_opname_items (
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

-- 15. TABEL PRODUCT_BATCHES (FEFO & EXPIRED)
CREATE TABLE product_batches (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    batch_no VARCHAR(100) NOT NULL,
    qty INTEGER NOT NULL DEFAULT 0,
    tanggal_masuk DATE NOT NULL DEFAULT CURRENT_DATE,
    expired_date DATE NOT NULL,
    catatan TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. TABEL BRANCH_TRANSFERS
CREATE TABLE branch_transfers (
    id SERIAL PRIMARY KEY,
    kode_transfer VARCHAR(50),
    from_outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    to_outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL,
    catatan TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. TABEL SHIFT_CLOSINGS (TUTUP BUKU SHIFT)
CREATE TABLE shift_closings (
    id SERIAL PRIMARY KEY,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    shift_name VARCHAR(20) NOT NULL,
    shift_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'CLOSED',
    notes TEXT,
    closed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    closed_by_name VARCHAR(100),
    unlocked_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    unlocked_at TIMESTAMP,
    total_items_in INTEGER DEFAULT 0,
    total_items_out INTEGER DEFAULT 0,
    total_defect_cases INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(outlet_id, shift_date, shift_name)
);

-- 18. TABEL AUDIT_LOGS
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(100),
    role VARCHAR(50),
    outlet_id INTEGER REFERENCES outlets(id) ON DELETE SET NULL,
    outlet_name VARCHAR(100),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. INDEXING UNTUK KECEPATAN QUERY
CREATE INDEX IF NOT EXISTS idx_stock_mutations_product_outlet ON stock_mutations(product_id, outlet_id);
CREATE INDEX IF NOT EXISTS idx_stocks_product_outlet ON stocks(product_id, outlet_id);
CREATE INDEX IF NOT EXISTS idx_opening_balances_outlet_tanggal ON opening_balances(outlet_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_stock_opnames_outlet_tanggal ON stock_opnames(outlet_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_product_batches_expired ON product_batches(expired_date);

-- ════════════════════════════════════════════════════════════════════
-- DATA AWAL (SEED DATA): OUTLET & PENGGUNA
-- Password untuk semua akun adalah: password123
-- ════════════════════════════════════════════════════════════════════
INSERT INTO outlets (nama, tipe, alamat) VALUES
('Central Kitchen (CK)', 'PUSAT', 'Jl. Pusat Kuliner Makassar'),
('Outlet Alauddin', 'CABANG', 'Jl. Sultan Alauddin No. 45'),
('Outlet BTP', 'CABANG', 'BTP Blok M Makassar'),
('Outlet Perintis', 'CABANG', 'Jl. Perintis Kemerdekaan KM 9');

INSERT INTO users (nama, username, password_hash, role, outlet_id) VALUES
('Owner RichiSam', 'owner', '$2b$10$9aMKydAOjEr2MjWDBIEKTefSE4HT1zWUKO8.frssD/AArprDuE9B6', 'OWNER', NULL),
('Admin Pusat', 'admin', '$2b$10$9aMKydAOjEr2MjWDBIEKTefSE4HT1zWUKO8.frssD/AArprDuE9B6', 'ADMIN_PUSAT', 1),
('Admin Gudang CK', 'admingudang', '$2b$10$9aMKydAOjEr2MjWDBIEKTefSE4HT1zWUKO8.frssD/AArprDuE9B6', 'ADMIN_GUDANG', 1),
('Staf Cabang Alauddin', 'stafalauddin', '$2b$10$9aMKydAOjEr2MjWDBIEKTefSE4HT1zWUKO8.frssD/AArprDuE9B6', 'STAF_CABANG', 2),
('Staf Cabang BTP', 'stafbtp', '$2b$10$9aMKydAOjEr2MjWDBIEKTefSE4HT1zWUKO8.frssD/AArprDuE9B6', 'STAF_CABANG', 3),
('Staf Cabang Perintis', 'stafperintis', '$2b$10$9aMKydAOjEr2MjWDBIEKTefSE4HT1zWUKO8.frssD/AArprDuE9B6', 'STAF_CABANG', 4);

-- DATA AWAL BAHAN BAKU F&B
INSERT INTO products (kode, nama, satuan, kategori, harga) VALUES
('PRD-001', 'AYAM MARINASI 1 EKOR', 'ekor', 'Protein & Frozen', 38000),
('PRD-002', 'AYAM MARINASI POTONG', 'potong', 'Protein & Frozen', 9500),
('PRD-003', 'BERAS', 'kg', 'Sembako & Bumbu Kering', 14000),
('PRD-004', 'MINYAK GORENG', 'liter', 'Minyak & Bumbu Basah', 17000),
('PRD-005', 'TEPUNG BUMBU CRISPY', 'kg', 'Sembako & Bumbu Kering', 12500),
('PRD-006', 'CABAI RAWIT MERAH', 'kg', 'Sayuran & Segar', 45000),
('PRD-007', 'BAWANG PUTIH', 'kg', 'Sayuran & Segar', 35000),
('PRD-008', 'KEJU SLICE', 'slice', 'Protein & Frozen', 1200),
('PRD-009', 'KOTAK MAKAN DUS', 'pcs', 'Kemasan & Plastik', 850),
('PRD-010', 'KERTAS NASI', 'lembar', 'Kemasan & Plastik', 150);

-- INISIALISASI SALDO STOK AWAL DI OUTLET
INSERT INTO stocks (product_id, outlet_id, qty_current)
SELECT p.id, o.id, 50
FROM products p CROSS JOIN outlets o;

INSERT INTO par_stocks (product_id, outlet_id, min_qty)
SELECT p.id, o.id, 20
FROM products p CROSS JOIN outlets o;

