# Entity Relationship Diagram (ERD) - RichiStock

Berikut adalah diagram relasi entitas untuk database proyek RichiStock setelah penyesuaian skema Master Data & Inventaris (Prompt I1).

```mermaid
erDiagram
    OUTLETS {
        int id PK
        varchar nama
        enum tipe "PUSAT|CABANG"
        text alamat
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    USERS {
        int id PK
        varchar nama
        varchar username
        varchar password_hash
        enum role "OWNER|ADMIN_PUSAT|STAF_CABANG"
        int outlet_id FK
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    PRODUCTS {
        int id PK
        varchar kode
        varchar nama
        int urutan
        numeric harga
        varchar satuan
        varchar kategori
        boolean satuan_perlu_konfirmasi
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    OPENING_BALANCES {
        int id PK
        int product_id FK
        int outlet_id FK
        int qty
        date tanggal
        int created_by FK
        timestamp created_at
        timestamp updated_at
    }

    PAR_STOCKS {
        int id PK
        int product_id FK
        int outlet_id FK
        int min_qty
        timestamp created_at
        timestamp updated_at
    }

    STOCKS {
        int id PK
        int product_id FK
        int outlet_id FK
        int qty_current
        timestamp created_at
        timestamp updated_at
    }

    STOCK_MUTATIONS {
        int id PK
        int product_id FK
        int outlet_id FK
        date tanggal
        enum shift "MIDNIGHT|PAGI|SORE"
        int saw
        int masuk
        int keluar
        int sak
        numeric harga_snapshot
        boolean is_opening
        int created_by FK
        enum sumber_masuk "MANUAL|TIKET"
        int ticket_id FK
        timestamp created_at
        timestamp updated_at
    }

    RESTOCK_TICKETS {
        int id PK
        varchar kode_tiket
        int outlet_id FK
        int requested_by FK
        enum status "DIAJUKAN|DIPROSES|SELESAI"
        text catatan
        int processed_by FK
        timestamp processed_at
        int received_by FK
        timestamp received_at
        boolean ada_selisih
        timestamp created_at
        timestamp updated_at
    }

    RESTOCK_TICKET_ITEMS {
        int id PK
        int ticket_id FK
        int product_id FK
        int qty_diminta
        int qty_dikirim
        int qty_diterima
    }

    DEFECT_REPORTS {
        int id PK
        int outlet_id FK
        int product_id FK
        int qty
        text deskripsi
        varchar foto_url
        enum status "BARU|DITINJAU|SELESAI"
        int reported_by FK
        timestamp created_at
        timestamp updated_at
    }

    NOTIFICATIONS {
        int id PK
        int outlet_id FK
        int product_id FK
        text pesan
        enum tipe "PAR_STOCK|TIKET|DEFECT"
        boolean is_read
        timestamp created_at
    }

    ASSETS {
        int id PK
        varchar kode
        varchar nama
        varchar kategori
        int urutan
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    ASSET_STOCKS {
        int id PK
        int asset_id FK
        int outlet_id FK
        int qty_baik
        int qty_rusak
        text keterangan
        timestamp created_at
        timestamp updated_at
    }

    STOCK_OPNAMES {
        int id PK
        varchar kode
        int outlet_id FK
        date tanggal
        enum status "DRAFT|FINAL"
        text catatan
        int created_by FK
        int finalized_by FK
        timestamp finalized_at
        timestamp created_at
        timestamp updated_at
    }

    STOCK_OPNAME_ITEMS {
        int id PK
        int opname_id FK
        int product_id FK
        int qty_sistem
        int qty_fisik
        int selisih
        numeric harga_snapshot
        text alasan
        timestamp created_at
        timestamp updated_at
    }

    ASSET_OPNAME_ITEMS {
        int id PK
        int opname_id FK
        int asset_id FK
        int qty_sistem
        int qty_fisik
        int selisih
        text alasan
        timestamp created_at
        timestamp updated_at
    }

    %% Relationships
    OUTLETS ||--o{ USERS : "memiliki staf"
    OUTLETS ||--o{ PAR_STOCKS : "memiliki limit minimum"
    OUTLETS ||--o{ STOCKS : "memiliki inventaris"
    OUTLETS ||--o{ OPENING_BALANCES : "memiliki saldo awal"
    OUTLETS ||--o{ STOCK_MUTATIONS : "mencatat mutasi"
    OUTLETS ||--o{ RESTOCK_TICKETS : "mengajukan"
    OUTLETS ||--o{ DEFECT_REPORTS : "melaporkan defect"
    OUTLETS ||--o{ NOTIFICATIONS : "menerima notif"
    OUTLETS ||--o{ ASSET_STOCKS : "memiliki aset"
    OUTLETS ||--o{ STOCK_OPNAMES : "melakukan opname"

    PRODUCTS ||--o{ PAR_STOCKS : "batas minimum di"
    PRODUCTS ||--o{ STOCKS : "posisi stok di"
    PRODUCTS ||--o{ OPENING_BALANCES : "saldo awal di"
    PRODUCTS ||--o{ STOCK_MUTATIONS : "dimutasi pada"
    PRODUCTS ||--o{ RESTOCK_TICKET_ITEMS : "diminta pada"
    PRODUCTS ||--o{ DEFECT_REPORTS : "dilaporkan cacat"
    PRODUCTS ||--o{ NOTIFICATIONS : "terkait dengan"
    PRODUCTS ||--o{ STOCK_OPNAME_ITEMS : "dihitung pada opname"

    ASSETS ||--o{ ASSET_STOCKS : "stok unit di outlet"
    ASSETS ||--o{ ASSET_OPNAME_ITEMS : "dihitung pada opname"

    USERS ||--o{ STOCK_MUTATIONS : "menginput"
    USERS ||--o{ RESTOCK_TICKETS : "mengajukan/memproses/menerima"
    USERS ||--o{ DEFECT_REPORTS : "melaporkan"
    USERS ||--o{ STOCK_OPNAMES : "membuat/memfinalisasi"
    USERS ||--o{ OPENING_BALANCES : "menginput saldo awal"

    RESTOCK_TICKETS ||--|{ RESTOCK_TICKET_ITEMS : "terdiri dari"
    RESTOCK_TICKETS ||--o{ STOCK_MUTATIONS : "dikonversi menjadi"

    STOCK_OPNAMES ||--o{ STOCK_OPNAME_ITEMS : "rincian bahan opname"
    STOCK_OPNAMES ||--o{ ASSET_OPNAME_ITEMS : "rincian aset opname"
```
