const pool = require('../config/db');
const AuditService = require('./auditService');

class ShiftService {
  /**
   * Cek apakah suatu shift berstatus CLOSED (terkunci)
   */
  static async isShiftLocked(outletId, date, shiftName) {
    if (!outletId || !date || !shiftName) return false;
    const res = await pool.query(
      `SELECT id, status FROM shift_closings 
       WHERE outlet_id = $1 AND shift_date = $2 AND shift_name = $3`,
      [outletId, date, shiftName]
    );
    if (!res || !res.rows || res.rows.length === 0) return false;
    return res.rows[0].status === 'CLOSED';
  }

  /**
   * Ambil ringkasan aktivitas operasional shift untuk ditinjau sebelum tutup buku
   */
  static async getShiftSummary(outletId, date, shiftName) {
    // 1. Cek status closing yang sudah ada
    const closingRes = await pool.query(
      `SELECT sc.*, u.nama as closed_by_nama, o.nama as outlet_nama
       FROM shift_closings sc
       LEFT JOIN users u ON sc.closed_by_id = u.id
       LEFT JOIN outlets o ON sc.outlet_id = o.id
       WHERE sc.outlet_id = $1 AND sc.shift_date = $2 AND sc.shift_name = $3`,
      [outletId, date, shiftName]
    );

    const existingClosing = closingRes.rows[0] || null;

    // 2. Ambil agregat mutasi stok pada shift tersebut
    const mutasiRes = await pool.query(
      `SELECT 
        COUNT(*) as total_transaksi,
        COALESCE(SUM(masuk), 0) as total_qty_masuk,
        COALESCE(SUM(keluar), 0) as total_qty_keluar,
        COUNT(DISTINCT product_id) as total_produk_terlibat
       FROM stock_mutations
       WHERE outlet_id = $1 AND tanggal = $2 AND shift = $3`,
      [outletId, date, shiftName]
    );

    // 3. Ambil data defect/BS pada tanggal tersebut
    const defectRes = await pool.query(
      `SELECT 
        COUNT(*) as total_kasus_defect,
        COALESCE(SUM(qty), 0) as total_qty_defect
       FROM defect_reports
       WHERE outlet_id = $1 AND created_at::date = $2::date`,
      [outletId, date]
    );

    // 4. Ambil ringkasan detail mutasi per produk
    const detailMutasiRes = await pool.query(
      `SELECT 
        p.id as product_id,
        p.nama as nama_produk,
        p.satuan,
        sm.saw,
        sm.masuk,
        sm.keluar,
        sm.sak
       FROM stock_mutations sm
       JOIN products p ON sm.product_id = p.id
       WHERE sm.outlet_id = $1 AND sm.tanggal = $2 AND sm.shift = $3
       ORDER BY p.nama ASC`,
      [outletId, date, shiftName]
    );

    // Ambil info outlet
    const outletInfo = await pool.query('SELECT nama FROM outlets WHERE id = $1', [outletId]);

    return {
      outlet_id: parseInt(outletId),
      outlet_nama: outletInfo.rows[0]?.nama || 'Cabang',
      tanggal: date,
      shift: shiftName,
      is_locked: existingClosing ? existingClosing.status === 'CLOSED' : false,
      is_unlocked: existingClosing ? existingClosing.status === 'UNLOCKED' : false,
      status: existingClosing ? existingClosing.status : 'OPEN',
      closing_info: existingClosing,
      stats: {
        total_transaksi: parseInt(mutasiRes.rows[0]?.total_transaksi || 0),
        total_qty_masuk: parseFloat(mutasiRes.rows[0]?.total_qty_masuk || 0),
        total_qty_keluar: parseFloat(mutasiRes.rows[0]?.total_qty_keluar || 0),
        total_produk_terlibat: parseInt(mutasiRes.rows[0]?.total_produk_terlibat || 0),
        total_kasus_defect: parseInt(defectRes.rows[0]?.total_kasus_defect || 0),
        total_qty_defect: parseFloat(defectRes.rows[0]?.total_qty_defect || 0)
      },
      items: detailMutasiRes.rows
    };
  }

  /**
   * Tutup Buku & Kunci Shift (Shift Closing)
   */
  static async closeShift({ outletId, date, shiftName, notes = '', userId, userRole, userName, ipAddress = null }) {
    // 1. Periksa apakah sudah terkunci
    const checkRes = await pool.query(
      `SELECT id, status FROM shift_closings 
       WHERE outlet_id = $1 AND shift_date = $2 AND shift_name = $3`,
      [outletId, date, shiftName]
    );

    if (checkRes.rows.length > 0 && checkRes.rows[0].status === 'CLOSED') {
      throw new Error(`Shift ${shiftName} tanggal ${date} sudah ditutup dan terkunci.`);
    }

    // 2. Hitung statistik mutasi & defect riil
    const statsRes = await pool.query(
      `SELECT 
        COALESCE(SUM(masuk), 0) as total_in,
        COALESCE(SUM(keluar), 0) as total_out
       FROM stock_mutations
       WHERE outlet_id = $1 AND tanggal = $2 AND shift = $3`,
      [outletId, date, shiftName]
    );

    const defectRes = await pool.query(
      `SELECT COUNT(*) as defect_count FROM defect_reports
       WHERE outlet_id = $1 AND created_at::date = $2::date`,
      [outletId, date]
    );

    const totalIn = parseInt(statsRes.rows[0]?.total_in || 0);
    const totalOut = parseInt(statsRes.rows[0]?.total_out || 0);
    const defectCount = parseInt(defectRes.rows[0]?.defect_count || 0);

    let savedClosing;
    if (checkRes.rows.length > 0) {
      // Update record yang sebelumnya di-unlock
      const upd = await pool.query(
        `UPDATE shift_closings 
         SET status = 'CLOSED',
             notes = $1,
             closed_by_id = $2,
             closed_by_name = $3,
             total_items_in = $4,
             total_items_out = $5,
             total_defect_cases = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [notes, userId, userName, totalIn, totalOut, defectCount, checkRes.rows[0].id]
      );
      savedClosing = upd.rows[0];
    } else {
      // Insert baru
      const ins = await pool.query(
        `INSERT INTO shift_closings 
          (outlet_id, shift_name, shift_date, status, notes, closed_by_id, closed_by_name, total_items_in, total_items_out, total_defect_cases, created_at, updated_at)
         VALUES ($1, $2, $3, 'CLOSED', $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [outletId, shiftName, date, notes, userId, userName, totalIn, totalOut, defectCount]
      );
      savedClosing = ins.rows[0];
    }

    // Ambil nama outlet
    const outletRes = await pool.query('SELECT nama FROM outlets WHERE id = $1', [outletId]);
    const outletName = outletRes.rows[0]?.nama || `Cabang #${outletId}`;

    // 3. Catat ke AUDIT TRAIL secara otomatis
    await AuditService.logAction({
      userId,
      userName,
      role: userRole,
      outletId,
      outletName,
      module: 'SHIFT',
      action: 'SHIFT_CLOSE',
      description: `${userName} melakukan Tutup Buku Shift ${shiftName} pada tanggal ${date} (${outletName}). Total In: ${totalIn}, Out: ${totalOut}. Catatan: ${notes || 'Tidak ada'}`,
      details: {
        closing_id: savedClosing.id,
        shift: shiftName,
        tanggal: date,
        stats: { totalIn, totalOut, defectCount },
        notes
      },
      ipAddress
    });

    return savedClosing;
  }

  /**
   * Buka Kunci Shift (Unlock Shift - Otorisasi Khusus OWNER / ADMIN_PUSAT)
   */
  static async unlockShift({ closingId, userId, userRole, userName, reason = '', ipAddress = null }) {
    if (userRole !== 'OWNER' && userRole !== 'ADMIN_PUSAT') {
      throw new Error('Hanya Owner atau Admin Pusat yang memiliki wewenang membuka kunci shift.');
    }

    const cRes = await pool.query(
      `SELECT sc.*, o.nama as outlet_nama 
       FROM shift_closings sc
       JOIN outlets o ON sc.outlet_id = o.id
       WHERE sc.id = $1`,
      [closingId]
    );

    if (cRes.rows.length === 0) {
      throw new Error('Data tutup buku shift tidak ditemukan.');
    }

    const closing = cRes.rows[0];

    const upd = await pool.query(
      `UPDATE shift_closings 
       SET status = 'UNLOCKED',
           unlocked_by_id = $1,
           unlocked_at = CURRENT_TIMESTAMP,
           notes = CONCAT(COALESCE(notes, ''), ' [Dibuka oleh ', $2::text, ': ', $3::text, ']'),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [userId, userName, reason, closingId]
    );

    // Rekam ke AUDIT TRAIL
    await AuditService.logAction({
      userId,
      userName,
      role: userRole,
      outletId: closing.outlet_id,
      outletName: closing.outlet_nama,
      module: 'SHIFT',
      action: 'SHIFT_UNLOCK',
      description: `[PERINGATAN AUDIT] ${userName} (${userRole}) membuka kunci Shift ${closing.shift_name} tanggal ${closing.shift_date} (${closing.outlet_nama}). Alasan rekonsiliasi: ${reason || 'Tidak disertakan'}`,
      details: {
        closing_id: closing.id,
        shift: closing.shift_name,
        tanggal: closing.shift_date,
        reason
      },
      ipAddress
    });

    return upd.rows[0];
  }

  /**
   * Status shift seluruh cabang untuk monitoring Owner & Admin Pusat
   */
  static async getOutletsStatus(date, shiftName) {
    const outletsRes = await pool.query(
      `SELECT id, nama, tipe FROM outlets WHERE is_active = true ORDER BY (CASE WHEN tipe = 'CABANG' THEN 0 ELSE 1 END), id ASC`
    );

    const closingsRes = await pool.query(
      `SELECT sc.*, o.nama as outlet_nama, u.nama as closed_by_nama, un.nama as unlocked_by_nama
       FROM shift_closings sc
       JOIN outlets o ON sc.outlet_id = o.id
       LEFT JOIN users u ON sc.closed_by_id = u.id
       LEFT JOIN users un ON sc.unlocked_by_id = un.id
       WHERE sc.shift_date = $1 AND sc.shift_name = $2`,
      [date, shiftName]
    );

    const closingsMap = {};
    for (const c of closingsRes.rows) {
      closingsMap[c.outlet_id] = c;
    }

    return outletsRes.rows.map(o => {
      const closing = closingsMap[o.id] || null;
      return {
        outlet_id: o.id,
        outlet_nama: o.nama,
        outlet_tipe: o.tipe,
        status: closing ? closing.status : 'OPEN',
        is_locked: closing ? closing.status === 'CLOSED' : false,
        is_unlocked: closing ? closing.status === 'UNLOCKED' : false,
        closing_info: closing
      };
    });
  }

  /**
   * Riwayat Tutup Buku Shift
   */
  static async getShiftHistory({ outletId = null, page = 1, limit = 15, startDate = null, endDate = null, status = null }) {
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (outletId && outletId !== 'ALL') {
      conditions.push(`sc.outlet_id = $${paramIndex++}`);
      values.push(parseInt(outletId));
    }

    if (startDate) {
      conditions.push(`sc.shift_date >= $${paramIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`sc.shift_date <= $${paramIndex++}`);
      values.push(endDate);
    }

    if (status && status !== 'ALL') {
      conditions.push(`sc.status = $${paramIndex++}`);
      values.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query(`SELECT COUNT(*) FROM shift_closings sc ${whereClause}`, values);
    const total = parseInt(countRes.rows[0].count);

    const query = `
      SELECT sc.*, o.nama as outlet_nama, u.nama as closed_by_nama, un.nama as unlocked_by_nama
      FROM shift_closings sc
      JOIN outlets o ON sc.outlet_id = o.id
      LEFT JOIN users u ON sc.closed_by_id = u.id
      LEFT JOIN users un ON sc.unlocked_by_id = un.id
      ${whereClause}
      ORDER BY sc.shift_date DESC, sc.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataRes = await pool.query(query, [...values, parseInt(limit), offset]);

    return {
      data: dataRes.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)) || 1
      }
    };
  }
}

module.exports = ShiftService;
