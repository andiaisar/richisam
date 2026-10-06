-- Seed Outlets
INSERT INTO outlets (nama, tipe, alamat) VALUES
('Gudang Pusat Richisam', 'PUSAT', 'Jl. Pusat Makassar'),
('Cabang Alauddin', 'CABANG', 'Jl. Sultan Alauddin'),
('Cabang Perintis', 'CABANG', 'Jl. Perintis Kemerdekaan'),
('Cabang BTP', 'CABANG', 'BTP Makassar');

-- Seed Users (Password is 'password123')
INSERT INTO users (nama, username, password_hash, role, outlet_id) VALUES
('Owner Bos', 'owner', '$2b$10$9aMKydAOjEr2MjWDBIEKTefSE4HT1zWUKO8.frssD/AArprDuE9B6', 'OWNER', NULL),
('Admin Pusat 1', 'adminpusat', '$2b$10$9aMKydAOjEr2MjWDBIEKTefSE4HT1zWUKO8.frssD/AArprDuE9B6', 'ADMIN_PUSAT', 1),
('Staf Alauddin', 'stafalauddin', '$2b$10$9aMKydAOjEr2MjWDBIEKTefSE4HT1zWUKO8.frssD/AArprDuE9B6', 'STAF_CABANG', 2),
('Staf Perintis', 'stafperintis', '$2b$10$9aMKydAOjEr2MjWDBIEKTefSE4HT1zWUKO8.frssD/AArprDuE9B6', 'STAF_CABANG', 3),
('Staf BTP', 'stafbtp', '$2b$10$9aMKydAOjEr2MjWDBIEKTefSE4HT1zWUKO8.frssD/AArprDuE9B6', 'STAF_CABANG', 4);

-- Seed Products
INSERT INTO products (kode, nama, satuan, kategori) VALUES
('PRD001', 'Kopi Susu Blend', 'Gram', 'Bahan Baku'),
('PRD002', 'Gula Aren Cair', 'ml', 'Bahan Baku'),
('PRD003', 'Susu UHT', 'ml', 'Bahan Baku'),
('PRD004', 'Cup Plastik 16oz', 'Pcs', 'Packaging'),
('PRD005', 'Sedotan', 'Pcs', 'Packaging');

-- Seed Par Stocks (50 for cabang, 500 for pusat)
INSERT INTO par_stocks (product_id, outlet_id, min_qty)
SELECT p.id, o.id, 50
FROM products p CROSS JOIN outlets o
WHERE o.tipe = 'CABANG';

INSERT INTO par_stocks (product_id, outlet_id, min_qty)
SELECT p.id, o.id, 500
FROM products p CROSS JOIN outlets o
WHERE o.tipe = 'PUSAT';

-- Seed Stocks (100 for cabang, 1000 for pusat)
INSERT INTO stocks (product_id, outlet_id, qty_current)
SELECT p.id, o.id, 100
FROM products p CROSS JOIN outlets o
WHERE o.tipe = 'CABANG';

INSERT INTO stocks (product_id, outlet_id, qty_current)
SELECT p.id, o.id, 1000
FROM products p CROSS JOIN outlets o
WHERE o.tipe = 'PUSAT';
