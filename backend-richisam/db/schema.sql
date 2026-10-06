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

DROP TYPE IF EXISTS outlet_tipe_enum CASCADE;
DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS shift_enum CASCADE;
DROP TYPE IF EXISTS sumber_masuk_enum CASCADE;
DROP TYPE IF EXISTS ticket_status_enum CASCADE;
DROP TYPE IF EXISTS defect_status_enum CASCADE;
DROP TYPE IF EXISTS notif_tipe_enum CASCADE;

CREATE TYPE outlet_tipe_enum AS ENUM ('PUSAT', 'CABANG');
CREATE TYPE user_role_enum AS ENUM ('OWNER', 'ADMIN_PUSAT', 'STAF_CABANG');
CREATE TYPE shift_enum AS ENUM ('MIDNIGHT', 'PAGI', 'SORE');
CREATE TYPE sumber_masuk_enum AS ENUM ('MANUAL', 'TIKET');
CREATE TYPE ticket_status_enum AS ENUM ('DIAJUKAN', 'DIPROSES', 'SELESAI');
CREATE TYPE defect_status_enum AS ENUM ('BARU', 'DITINJAU', 'SELESAI');
CREATE TYPE notif_tipe_enum AS ENUM ('PAR_STOCK', 'TIKET', 'DEFECT');

CREATE TABLE outlets (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    tipe outlet_tipe_enum NOT NULL,
    alamat TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    kode VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    satuan VARCHAR(20) NOT NULL,
    kategori VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE par_stocks (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    min_qty INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, outlet_id)
);

CREATE TABLE stocks (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    qty_current INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, outlet_id)
);

CREATE TABLE restock_tickets (
    id SERIAL PRIMARY KEY,
    kode_tiket VARCHAR(50) UNIQUE NOT NULL,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    requested_by INTEGER NOT NULL REFERENCES users(id),
    status ticket_status_enum NOT NULL DEFAULT 'DIAJUKAN',
    catatan TEXT,
    processed_by INTEGER REFERENCES users(id),
    processed_at TIMESTAMP,
    received_by INTEGER REFERENCES users(id),
    received_at TIMESTAMP,
    ada_selisih BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_mutations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    shift shift_enum NOT NULL,
    saw INTEGER NOT NULL DEFAULT 0,
    masuk INTEGER NOT NULL DEFAULT 0,
    keluar INTEGER NOT NULL DEFAULT 0,
    sak INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER NOT NULL REFERENCES users(id),
    sumber_masuk sumber_masuk_enum DEFAULT 'MANUAL',
    ticket_id INTEGER REFERENCES restock_tickets(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, outlet_id, tanggal, shift)
);

CREATE TABLE restock_ticket_items (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES restock_tickets(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty_diminta INTEGER NOT NULL DEFAULT 0,
    qty_dikirim INTEGER DEFAULT 0,
    qty_diterima INTEGER DEFAULT 0
);

CREATE TABLE defect_reports (
    id SERIAL PRIMARY KEY,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL,
    deskripsi TEXT,
    foto_url VARCHAR(255) NOT NULL,
    status defect_status_enum NOT NULL DEFAULT 'BARU',
    reported_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    pesan TEXT NOT NULL,
    tipe notif_tipe_enum NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stocks_outlet_product ON stocks(outlet_id, product_id);
CREATE INDEX idx_mutations_date_shift ON stock_mutations(outlet_id, tanggal, shift);
CREATE INDEX idx_tickets_outlet_status ON restock_tickets(outlet_id, status);
CREATE INDEX idx_defects_outlet_status ON defect_reports(outlet_id, status);
CREATE INDEX idx_notif_outlet_read ON notifications(outlet_id, is_read);
