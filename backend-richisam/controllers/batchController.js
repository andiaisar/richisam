const pool = require('../config/db');

exports.getBatches = async (req, res) => {
  try {
    const { outlet_id, status, search } = req.query;
    
    // Staf cabang can only see their own outlet
    let outletFilter = outlet_id;
    if (req.user.role === 'STAF_CABANG') {
      outletFilter = req.user.outlet_id;
    }

    let query = `
      SELECT 
        b.id,
        b.product_id,
        p.kode as product_kode,
        p.nama as product_name,
        p.satuan as product_satuan,
        p.kategori as product_kategori,
        b.outlet_id,
        o.nama as outlet_name,
        b.batch_no,
        b.qty,
        TO_CHAR(b.tanggal_masuk, 'YYYY-MM-DD') as tanggal_masuk,
        TO_CHAR(b.expired_date, 'YYYY-MM-DD') as expired_date,
        (b.expired_date - CURRENT_DATE) as days_remaining,
        CASE 
          WHEN (b.expired_date - CURRENT_DATE) < 0 THEN 'EXPIRED'
          WHEN (b.expired_date - CURRENT_DATE) <= 3 THEN 'CRITICAL'
          WHEN (b.expired_date - CURRENT_DATE) <= 7 THEN 'WARNING'
          ELSE 'SAFE'
        END as status,
        b.catatan,
        b.created_at,
        u.nama as creator_name
      FROM product_batches b
      JOIN products p ON b.product_id = p.id
      JOIN outlets o ON b.outlet_id = o.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (outletFilter) {
      params.push(outletFilter);
      query += ` AND b.outlet_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      query += ` AND (LOWER(p.nama) LIKE $${params.length} OR LOWER(b.batch_no) LIKE $${params.length} OR LOWER(p.kode) LIKE $${params.length})`;
    }

    if (status && status !== 'ALL') {
      if (status === 'EXPIRED') {
        query += ` AND (b.expired_date - CURRENT_DATE) < 0`;
      } else if (status === 'CRITICAL') {
        query += ` AND (b.expired_date - CURRENT_DATE) >= 0 AND (b.expired_date - CURRENT_DATE) <= 3`;
      } else if (status === 'WARNING') {
        query += ` AND (b.expired_date - CURRENT_DATE) > 3 AND (b.expired_date - CURRENT_DATE) <= 7`;
      } else if (status === 'SAFE') {
        query += ` AND (b.expired_date - CURRENT_DATE) > 7`;
      }
    }

    query += ` ORDER BY b.expired_date ASC, b.id ASC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error('getBatches error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const { product_id, outlet_id, batch_no, qty, tanggal_masuk, expired_date, catatan } = req.body;
    
    if (!product_id || !batch_no || !qty || !expired_date) {
      return res.status(400).json({ success: false, message: 'Harap lengkapi Produk, Nomor Batch, Jumlah, dan Tanggal Kadaluarsa' });
    }

    let finalOutletId = outlet_id;
    if (req.user.role === 'STAF_CABANG') {
      finalOutletId = req.user.outlet_id;
    } else if (!finalOutletId) {
      return res.status(400).json({ success: false, message: 'Pilih Outlet/Cabang penyimpanan' });
    }

    const tglMasuk = tanggal_masuk || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `INSERT INTO product_batches (product_id, outlet_id, batch_no, qty, tanggal_masuk, expired_date, catatan, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [product_id, finalOutletId, batch_no.trim(), parseInt(qty), tglMasuk, expired_date, catatan || '', req.user.id]
    );

    res.status(201).json({ success: true, message: 'Pencatatan batch kadaluarsa berhasil disimpan', data: result.rows[0] });
  } catch (e) {
    console.error('createBatch error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM product_batches WHERE id = $1', [id]);
    res.json({ success: true, message: 'Batch berhasil dihapus / selesai digunakan' });
  } catch (e) {
    console.error('deleteBatch error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getBatchSummary = async (req, res) => {
  try {
    let outletFilter = req.query.outlet_id;
    if (req.user.role === 'STAF_CABANG') {
      outletFilter = req.user.outlet_id;
    }

    let baseQuery = `FROM product_batches b WHERE 1=1`;
    const params = [];
    if (outletFilter) {
      params.push(outletFilter);
      baseQuery += ` AND b.outlet_id = $1`;
    }

    const summaryQuery = `
      SELECT
        COUNT(*) as total_batches,
        COALESCE(SUM(CASE WHEN (b.expired_date - CURRENT_DATE) < 0 THEN 1 ELSE 0 END), 0) as total_expired,
        COALESCE(SUM(CASE WHEN (b.expired_date - CURRENT_DATE) >= 0 AND (b.expired_date - CURRENT_DATE) <= 3 THEN 1 ELSE 0 END), 0) as total_critical,
        COALESCE(SUM(CASE WHEN (b.expired_date - CURRENT_DATE) > 3 AND (b.expired_date - CURRENT_DATE) <= 7 THEN 1 ELSE 0 END), 0) as total_warning,
        COALESCE(SUM(CASE WHEN (b.expired_date - CURRENT_DATE) > 7 THEN 1 ELSE 0 END), 0) as total_safe,
        COALESCE(SUM(CASE WHEN (b.expired_date - CURRENT_DATE) <= 3 THEN b.qty ELSE 0 END), 0) as at_risk_qty
      ${baseQuery}
    `;

    const resSummary = await pool.query(summaryQuery, params);
    
    // Also fetch the top 5 most urgent expiring batches for quick alert
    let urgentQuery = `
      SELECT 
        b.id,
        p.nama as product_name,
        p.satuan as product_satuan,
        o.nama as outlet_name,
        b.batch_no,
        b.qty,
        TO_CHAR(b.expired_date, 'YYYY-MM-DD') as expired_date,
        (b.expired_date - CURRENT_DATE) as days_remaining
      FROM product_batches b
      JOIN products p ON b.product_id = p.id
      JOIN outlets o ON b.outlet_id = o.id
      WHERE (b.expired_date - CURRENT_DATE) <= 7
    `;
    if (outletFilter) {
      urgentQuery += ` AND b.outlet_id = $1`;
    }
    urgentQuery += ` ORDER BY b.expired_date ASC LIMIT 5`;

    const resUrgent = await pool.query(urgentQuery, params);

    res.json({
      success: true,
      data: {
        metrics: resSummary.rows[0],
        urgent_batches: resUrgent.rows
      }
    });
  } catch (e) {
    console.error('getBatchSummary error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};
