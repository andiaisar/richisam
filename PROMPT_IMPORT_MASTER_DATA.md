# Prompt Implementasi: Digitalisasi Master Data Stoklist Gudang BTP

Dokumen ini adalah **lanjutan** dari `PROMPT_RICHISTOCK.md`. Pakai setelah Fase 1 (database) selesai, dan **sebelum** mengerjakan Fase 3C (Mutasi Stok).

File pendukung yang harus ditaruh di repo, folder `backend/src/db/seeds/data/`:
- `master_products.csv` (68 bahan baku/perlengkapan habis pakai)
- `master_assets.csv` (96 peralatan/inventaris dari sheet STOK OPNAME)

---

## 1. Hasil Analisis File Excel

**Struktur file:** 32 sheet = 31 sheet `TANGGAL 1` s.d. `TANGGAL 31` + 1 sheet `STOK OPNAME`.

**Sheet harian (satu sheet = satu tanggal, 68 barang):**

| Kolom | Isi |
|---|---|
| A-C | No, Nama Barang, Harga (harga per satuan terkecil) |
| D-H | Shift **MIDNIGHT**: SAW, M, SAK, K, Total Harga |
| I-M | Shift **PAGI**: SAW, M, SAK, K, Total Harga |
| N-R | Shift **SORE**: SAW, M, SAK, K, Total Harga |
| T | Total Keluar = K Midnight + K Pagi + K Sore |
| U-W | Stok Gudang (= SAK Sore), Stok Outlet (input), Total (= Gudang + Outlet) |

**Logika rumus asli (penting, berbeda dari asumsi awal draf):**

| Kolom | Rumus Excel | Artinya |
|---|---|---|
| SAW Midnight (tgl 1) | input manual | Stok awal bulan |
| SAW Midnight (tgl N) | `= SAK Sore tgl N-1` | Rantai antar-hari |
| SAW Pagi / Sore | `= SAK shift sebelumnya` | Rantai antar-shift |
| M | input manual | Barang masuk |
| **SAK** | **input manual (hasil hitung fisik)** | Stok akhir shift |
| **K** | **`= SAW + M - SAK`** | **Barang keluar dihitung otomatis** |
| Total Harga | `= SAK x Harga` | Nilai persediaan |

> **Temuan utama:** di Excel mitra, staf menginput **SAK (hitung fisik)** dan **K dihitung otomatis** (pemakaian = apa yang hilang dari stok). Ini kebalikan dari rumus di prompt awal (`SAK = SAW + M - K`). Karena sistem digital harus meniru praktik nyata di lapangan, **aturan bisnis direvisi** di bagian 2.

**Sheet STOK OPNAME:**
- Bagian atas: 68 barang yang sama, kolom Outlet, Gudang, Jumlah, Total Harga.
- Bagian bawah (baris 73 dst): **96 peralatan/inventaris** (baskom, panci, timbangan, dll) dengan Stock Qty, Stock Outlet, Alasan. Ini barang **tidak habis pakai**, jadi harus dipisah dari bahan baku.

**Temuan data lain:**
1. Sheet harian **tidak berisi data transaksi** (tidak ada angka input), hanya template dan rumus. Jadi yang dimigrasi hanya **master data**, bukan riwayat.
2. Sheet `TANGGAL 1` berjudul "GUDANG", sheet lain berjudul "BTP". Diasumsikan **BTP = Gudang Pusat**.
3. Tidak ada kolom **satuan**. Harga seperti `13.6` (Beras) dan `0.57` (Galon) menunjukkan harga per gram/ml, sedangkan `34123` (Ayam 1 ekor) per pcs. Satuan harus dikonfirmasi ke mitra.
4. `SELOTIP` dan `LOYALTI CARD` berharga 0.
5. Rumus Total Harga di STOK OPNAME **salah**: `=E+D*C` (Gudang tidak dikali harga). Seharusnya `=F*C` (Jumlah x Harga). Di sistem baru harus benar.
6. Nomor urut di STOK OPNAME tidak sinkron dengan sheet harian (ada nomor yang terlewat).
7. Ada typo nama (`PELASTIK`, `Sambel` vs `Sambal`) yang sebaiknya dirapikan.
8. Setiap awal bulan Admin harus menduplikasi 31 sheet secara manual. Ini persis masalah yang diselesaikan sistem.

**Pemetaan ke database RichiStock:**

| Excel | Tabel / Fitur |
|---|---|
| Daftar 68 barang + Harga | `products` (+ `harga`, `satuan`, `kategori`) |
| Sheet harian per shift | `stock_mutations` |
| Kolom Gudang / Outlet / Total | `stocks` per outlet, ditampilkan di dasbor |
| Total Keluar | agregat K tiga shift (laporan) |
| STOK OPNAME bagian atas | `stock_opnames` + `stock_opname_items` |
| 96 peralatan | `assets` + `asset_stocks` |

---

## 2. REVISI ATURAN BISNIS (tempel menggantikan aturan nomor 1 di Konteks Tetap)

```
REVISI ATURAN MUTASI STOK (berdasarkan spreadsheet asli mitra):
- Per shift (MIDNIGHT, PAGI, SORE) staf menginput M (barang masuk) dan SAK (stok akhir hasil hitung fisik).
- SAW tidak diinput: SAW shift berikutnya = SAK shift sebelumnya.
  SAW MIDNIGHT hari baru = SAK SORE hari sebelumnya.
  Khusus hari pertama sebuah produk di sebuah outlet, SAW diambil dari stok awal (opening balance) yang diinput Admin.
- K (barang keluar/pemakaian) DIHITUNG BACKEND: K = SAW + M - SAK.
- Validasi: SAK tidak boleh negatif dan SAK <= SAW + M (K tidak boleh negatif).
  Jika K < 0 tolak dengan pesan "Stok akhir melebihi stok awal + barang masuk. Periksa hitungan atau catat barang masuk."
- Nilai persediaan per baris = SAK x harga produk. Total Keluar harian = K MIDNIGHT + K PAGI + K SORE.
- Harga disimpan per produk (harga per satuan terkecil). Simpan snapshot harga pada setiap baris mutasi agar laporan lama tidak berubah saat harga diperbarui.
- stocks.qty_current selalu = SAK dari mutasi terbaru.
```

---

## PROMPT I1: Migrasi Tambahan Skema

```
Tambahkan migrasi baru (jangan ubah migrasi lama) untuk menyesuaikan skema RichiStock dengan master data mitra:

1. ALTER TABLE products:
   - urutan integer (urutan tampil seperti di spreadsheet asli)
   - harga numeric(14,2) NOT NULL DEFAULT 0 (harga per satuan terkecil)
   - satuan varchar(20) (contoh: gram, ml, pcs, pack, lembar)
   - kategori varchar(60)
   - satuan_perlu_konfirmasi boolean DEFAULT true

2. ALTER TABLE stock_mutations:
   - ubah semantik: kolom saw dihitung sistem, sak diinput staf, keluar dihitung = saw + masuk - sak
   - tambah CHECK (sak >= 0) dan CHECK (keluar >= 0)
   - tambah kolom harga_snapshot numeric(14,2)
   - tambah kolom is_opening boolean DEFAULT false (penanda baris stok awal)

3. Tabel baru opening_balances: id, product_id, outlet_id, qty, tanggal, created_by. UNIQUE(product_id, outlet_id).

4. Tabel baru assets (inventaris peralatan non-habis pakai): id, kode (unique), nama, kategori, urutan, is_active.
5. Tabel baru asset_stocks: id, asset_id, outlet_id, qty_baik, qty_rusak, keterangan. UNIQUE(asset_id, outlet_id).

6. Tabel baru stock_opnames: id, kode (unique, format OPN-YYYYMM-XXX), outlet_id, tanggal, status (DRAFT|FINAL), catatan, created_by, finalized_by, finalized_at.
7. Tabel baru stock_opname_items: id, opname_id, product_id, qty_sistem, qty_fisik, selisih (kolom turunan = qty_fisik - qty_sistem), harga_snapshot, alasan.
8. Tabel baru asset_opname_items: id, opname_id, asset_id, qty_sistem, qty_fisik, selisih, alasan.

Tambahkan index pada (outlet_id, tanggal) dan (product_id, outlet_id). Perbarui diagram ERD di docs/erd.md.
Jalankan migrasi dan pastikan tidak ada error.
```

---

## PROMPT I2: Seed Master Data dari CSV

```
Buat script seed idempotent (npm run seed:master) yang membaca dua file CSV di backend/src/db/seeds/data/:
- master_products.csv: kolom urutan, nama, harga, kategori_usulan, satuan_dugaan_perlu_konfirmasi
- master_assets.csv: kolom urutan, nama, qty_gudang

Aturan:
1. Gunakan library csv-parse. Baca file dengan encoding UTF-8.
2. Products: generate kode otomatis PRD-001, PRD-002, ... berdasarkan kolom urutan. Upsert berdasarkan kode (ON CONFLICT DO UPDATE). Isi harga, kategori (dari kategori_usulan), urutan.
   - Kolom satuan: jika harga < 100 isi 'gram', selain itu isi 'pcs', dan set satuan_perlu_konfirmasi = true.
   - Rapikan nama: trim spasi ganda, perbaiki "PELASTIK" menjadi "PLASTIK", dan jadikan Title Case atau huruf besar konsisten (pilih satu dan terapkan merata).
3. Assets: kode AST-001 dst, upsert berdasarkan kode, kategori diisi 'Peralatan'. Buat asset_stocks untuk outlet Gudang Pusat dengan qty_baik dari kolom qty_gudang.
4. Untuk setiap produk aktif, pastikan ada baris stocks (qty 0) untuk Gudang Pusat dan semua outlet CABANG. Jangan menimpa qty yang sudah ada.
5. Di akhir, cetak ringkasan: jumlah produk dibuat/diupdate, jumlah aset, produk berharga 0, dan produk dengan satuan_perlu_konfirmasi = true.
6. Script harus aman dijalankan berulang kali tanpa membuat duplikat.

Setelah selesai, tunjukkan hasil query: SELECT kategori, COUNT(*) FROM products GROUP BY kategori; (harapannya total 68 produk) dan SELECT COUNT(*) FROM assets; (harapannya 96).
```

---

## PROMPT I3: Revisi Modul Mutasi Stok (SAK diinput, K dihitung)

```
Kerjakan (atau revisi jika sudah dibuat) modul Mutasi Stok Harian mengikuti ATURAN MUTASI STOK REVISI di Konteks Tetap.

Endpoint:
- GET /api/mutations/form?outlet_id=&tanggal=&shift=
  Kembalikan semua produk aktif urut berdasarkan products.urutan beserta: saw (otomatis), harga, satuan, par stock outlet, dan jika mutasi sudah ada kembalikan masuk & sak yang tersimpan.
  Sumber SAW: SAK shift sebelumnya; MIDNIGHT = SAK SORE hari sebelumnya; jika belum ada riwayat gunakan opening_balances; jika tidak ada sama sekali, 0.
- POST /api/mutations
  Body: { outlet_id, tanggal, shift, items: [{ product_id, masuk, sak }] }
  Backend menghitung saw dan keluar = saw + masuk - sak. Tolak seluruh request (transaksi di-rollback) jika ada item yang K < 0 atau sak < 0, dan kembalikan daftar item bermasalah beserta alasannya.
  Simpan harga_snapshot dari products.harga. Update stocks.qty_current = sak.
  Wajibkan shift berurutan (MIDNIGHT -> PAGI -> SORE) dan hari berurutan. Beri pesan jelas jika shift sebelumnya belum diinput.
  Setelah commit, panggil checkParStock untuk tiap produk yang berubah.
- PUT /api/mutations/:id: koreksi hanya untuk shift terbaru yang belum diikuti shift berikutnya.
- POST /api/opening-balances (ADMIN_PUSAT): input stok awal per produk per outlet (bulk). Hanya boleh sekali per produk-outlet kecuali ADMIN melakukan reset dengan konfirmasi.
- GET /api/mutations/daily-summary?outlet_id=&tanggal=: per produk, tampilkan SAW/M/SAK/K tiap shift, total_keluar, stok_gudang (= SAK SORE), nilai persediaan (SAK x harga).

Tulis unit test untuk:
1. Rantai SAW antar shift dan antar hari (termasuk pergantian bulan).
2. K = SAW + M - SAK pada contoh: SAW 100, M 50, SAK 120 -> K 30.
3. Penolakan SAK > SAW + M, penolakan nilai negatif.
4. Harga snapshot tidak berubah setelah harga produk diubah.
```

---

## PROMPT I4: Stok Opname & Inventaris Peralatan

```
Buat modul Stok Opname (hitung fisik berkala) dan Inventaris Peralatan.

A. Stok Opname bahan baku
- POST /api/opnames (ADMIN_PUSAT atau STAF_CABANG sesuai outlet): buat opname DRAFT untuk outlet + tanggal. Otomatis isi opname_items untuk semua produk aktif dengan qty_sistem = stocks.qty_current.
- PUT /api/opnames/:id/items: simpan qty_fisik dan alasan per item (bulk). selisih dihitung backend = qty_fisik - qty_sistem.
- PATCH /api/opnames/:id/finalize: ubah status ke FINAL, kunci data. Opsi apply_adjustment=true untuk menyesuaikan stocks.qty_current ke qty_fisik (catat sebagai mutasi koreksi). Wajib alasan untuk setiap item yang selisih != 0.
- GET /api/opnames dan GET /api/opnames/:id (dengan total nilai selisih = selisih x harga_snapshot). Gunakan rumus yang benar: nilai = jumlah x harga (perbaikan dari rumus Excel lama yang salah).
- Opname yang sudah FINAL tidak bisa diubah.

B. Inventaris Peralatan (aset non-habis pakai)
- CRUD /api/assets (ADMIN_PUSAT), pencarian dan pagination.
- GET/PUT /api/asset-stocks?outlet_id=: jumlah kondisi baik dan rusak per aset per outlet.
- Opname aset: gunakan asset_opname_items dengan alur yang sama seperti bahan baku.

Semua perubahan multi-tabel memakai transaksi. Tulis tes untuk: opname FINAL tidak bisa diedit, selisih dihitung benar, adjustment mengubah stok.
```

---

## PROMPT I5: Export Excel Meniru Format Mitra

```
Buat endpoint GET /api/reports/monthly/export?outlet_id=&bulan=&tahun= yang menghasilkan file .xlsx dengan exceljs, meniru format spreadsheet lama mitra agar mudah diterima oleh Admin:

1. Satu workbook, satu sheet per tanggal dalam bulan tersebut (TANGGAL 1 s.d. TANGGAL 28/29/30/31 sesuai bulan), plus sheet "REKAP BULANAN" dan sheet "STOK OPNAME".
2. Layout sheet harian:
   - Baris 1: nama outlet dan tanggal.
   - Baris 2-3 (header, sel digabung): NO | NAMA BARANG | Harga | MIDNIGHT (SAW, M, SAK, K, Total Harga) | PAGI (...) | SORE (...) | TOTAL KELUAR | GUDANG | OUTLET | TOTAL.
   - Data urut berdasarkan products.urutan.
   - Pakai FORMULA Excel sungguhan agar tetap menghitung jika diedit: K = SAW+M-SAK, Total Harga = SAK*Harga, Total Keluar = K Midnight + K Pagi + K Sore, Gudang = SAK Sore, Total = Gudang + Outlet. SAW shift berikutnya = sel SAK shift sebelumnya.
   - Header berwarna, border, freeze pane di bawah header dan kolom Nama Barang, format angka ribuan, lebar kolom rapi, legenda SAW/M/SAK di bawah tabel.
3. Sheet REKAP BULANAN: per produk, total masuk, total keluar, SAK akhir bulan, nilai persediaan akhir, rata-rata keluar per hari.
4. Sheet STOK OPNAME: ambil opname FINAL terakhir di bulan itu. Total Harga = Jumlah x Harga.
5. Nama file: Laporan_Stok_<Outlet>_<MM-YYYY>.xlsx dengan Content-Disposition attachment.
6. Hanya ADMIN_PUSAT dan OWNER (semua outlet), STAF_CABANG hanya outlet sendiri.

Gunakan satu query agregasi per bulan (hindari N+1). Uji dengan data dummy satu minggu lalu buka hasilnya di Excel untuk memastikan formula tidak error.
```

---

## PROMPT I6 (Opsional): Import Spreadsheet Lama

```
Buat fitur import untuk mengisi data dari spreadsheet format lama mitra (migrasi bulan berjalan):

- POST /api/import/mutations (ADMIN_PUSAT), multipart dengan file .xlsx.
- Parser (exceljs): baca sheet bernama "TANGGAL <n>", cocokkan baris dengan produk berdasarkan NAMA BARANG (case-insensitive, trim). Ambil nilai input M dan SAK untuk tiap shift (kolom E,F / J,K / O,P) serta Outlet (kolom V). Abaikan kolom berformula.
- Mode dry-run (query ?dry_run=true): kembalikan laporan pratinjau berisi jumlah baris valid, nama barang yang tidak cocok, dan baris dengan K < 0, tanpa menyimpan apa pun.
- Mode simpan: jalankan dalam satu transaksi, urutkan berdasarkan tanggal lalu shift, gunakan logika yang sama dengan POST /api/mutations. Rollback seluruhnya jika ada error.
- Batasi ukuran file 5 MB dan tipe .xlsx saja.
```

---

## PROMPT I7: Frontend

```
Tambahkan halaman frontend berikut (React + Tailwind, terhubung ke API), ikuti komponen dan layout yang sudah ada:

1. Master Data Produk (ADMIN_PUSAT): tabel dengan kolom Urutan, Kode, Nama, Kategori, Satuan, Harga; filter kategori; pencarian; edit inline atau modal; badge kuning "Satuan perlu konfirmasi" untuk satuan_perlu_konfirmasi = true; tombol edit massal satuan; format harga Rupiah.
2. Stok Awal (ADMIN_PUSAT): halaman input opening balance per outlet (tabel produk dengan input qty, tombol simpan massal).
3. Input Mutasi Harian (STAF_CABANG / ADMIN untuk Gudang Pusat): pilih tanggal dan shift, tabel mirip spreadsheet asli (urut sesuai products.urutan):
   - SAW: read-only (otomatis)
   - M: input
   - SAK: input (hasil hitung fisik)
   - K: read-only, dihitung langsung di UI = SAW + M - SAK, berwarna merah jika negatif dan blokir tombol Simpan
   - Total Harga: read-only = SAK x harga
   - Baris stok di bawah par diberi highlight
   - Navigasi keyboard Enter/Tab antar sel agar cepat diisi, pencarian barang, dan ringkasan total nilai persediaan di footer.
4. Stok Opname: daftar opname, form opname dengan kolom Sistem, Fisik, Selisih (merah/hijau), Alasan; tombol Finalize dengan konfirmasi.
5. Inventaris Peralatan: tabel aset per outlet dengan jumlah baik/rusak dan opname aset.
6. Laporan: tombol "Export Excel (format mitra)" yang memanggil endpoint export.
Semua halaman wajib punya loading state, empty state, dan penanganan error, serta responsif untuk smartphone.
```

---

## Checklist Verifikasi Setelah Implementasi

- [ ] `npm run seed:master` menghasilkan 68 produk dan 96 aset, tanpa duplikat saat dijalankan dua kali.
- [ ] Contoh uji: SAW 100, M 50, SAK 120 menghasilkan K = 30.
- [ ] SAW Midnight hari berikutnya sama dengan SAK Sore hari sebelumnya.
- [ ] SAK > SAW + M ditolak.
- [ ] Export Excel terbuka di Excel tanpa error formula dan nilainya sama dengan di aplikasi.
- [ ] Opname FINAL tidak bisa diedit; nilai selisih memakai rumus Jumlah x Harga.

## Hal yang Perlu Dikonfirmasi ke Mitra

1. **Satuan** tiap barang (gram, ml, pcs, pack, kg, dll) karena tidak ada di Excel.
2. Apakah **BTP = Gudang Pusat** dan berapa jumlah outlet beserta namanya.
3. Apakah **Stok Outlet** (kolom V) memang diinput manual per barang, atau nanti dihitung otomatis dari stok tiap cabang di sistem.
4. Harga **SELOTIP** dan **LOYALTI CARD** (saat ini 0).
5. Apakah par stock awal per cabang sudah ada, atau ditentukan baru bersama mitra.
