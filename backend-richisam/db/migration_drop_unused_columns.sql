-- ════════════════════════════════════════════════════════════════════
-- MIGRASI: HAPUS KOLOM YANG TIDAK DIGUNAKAN APLIKASI
-- Kolom di bawah tidak pernah ditulis maupun dibaca oleh backend/frontend.
-- Aman dijalankan berulang kali (IF EXISTS). Jalankan di SQL Editor Supabase.
-- ════════════════════════════════════════════════════════════════════
BEGIN;

ALTER TABLE stock_mutations DROP COLUMN IF EXISTS sisa;
ALTER TABLE restock_tickets DROP COLUMN IF EXISTS nomor_tiket;   -- digantikan kode_tiket
ALTER TABLE restock_tickets DROP COLUMN IF EXISTS created_by;    -- digantikan requested_by
ALTER TABLE defect_reports  DROP COLUMN IF EXISTS batch_number;
ALTER TABLE notifications   DROP COLUMN IF EXISTS reference_id;

COMMIT;
