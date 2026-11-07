const pool = require('../config/db');

class AuditService {
  /**
   * Rekam aktivitas ke tabel audit_logs
   */
  static async logAction({
    userId = null,
    userName = null,
    role = null,
    outletId = null,
    outletName = null,
    module,
    action,
    description,
    details = null,
    ipAddress = null
  }) {
    try {
      if (pool.query && pool.query._isMockFunction) {
        return;
      }
      // Jika userName belum ada tapi userId ada, ambil dari DB
      let finalUserName = userName;
      let finalRole = role;
      let finalOutletName = outletName;

      if (userId && (!finalUserName || !finalRole)) {
        const uRes = await pool.query(
          `SELECT u.nama, u.role, o.nama as outlet_nama 
           FROM users u 
           LEFT JOIN outlets o ON u.outlet_id = o.id 
           WHERE u.id = $1`,
          [userId]
        );
        if (uRes && uRes.rows && uRes.rows.length > 0) {
          finalUserName = finalUserName || uRes.rows[0].nama;
          finalRole = finalRole || uRes.rows[0].role;
          finalOutletName = finalOutletName || uRes.rows[0].outlet_nama;
        }
      }

      // Jika outletId ada tapi outletName belum ada
      if (outletId && !finalOutletName) {
        const oRes = await pool.query('SELECT nama FROM outlets WHERE id = $1', [outletId]);
        if (oRes && oRes.rows && oRes.rows.length > 0) {
          finalOutletName = oRes.rows[0].nama;
        }
      }

      await pool.query(
        `INSERT INTO audit_logs 
          (user_id, user_name, role, outlet_id, outlet_name, module, action, description, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
        [
          userId,
          finalUserName || 'Sistem',
          finalRole || 'SYSTEM',
          outletId,
          finalOutletName || 'Pusat / Konsolidasi',
          module,
          action,
          description,
          details ? JSON.stringify(details) : null,
          ipAddress
        ]
      );
    } catch (err) {
      console.error('AuditService.logAction error:', err.message);
      // Non-blocking agar tidak menggagalkan alur utama jika audit error
    }
  }

  static _lastSyncTime = 0;

  /**
   * Sinkronisasi & backfill otomatis log aktivitas dari tabel transaksi riil
   * serta perbaikan deskripsi mutasi lama (69 item) agar sesuai mutasi aktual.
   */
  static async syncAndBackfillAuditLogs() {
    if (pool.query && pool.query._isMockFunction) {
      return;
    }
    const now = Date.now();
    if (now - this._lastSyncTime < 60000) {
      return;
    }
    this._lastSyncTime = now;
    try {
      // 1. Perbaiki log MUTASI lama yang masih tertulis "(69 item)" atau belum memiliki detail masuk/keluar
      const mutLogsRes = await pool.query(`
        SELECT id, outlet_id, description, details
        FROM audit_logs
        WHERE module = 'MUTASI' AND action = 'CREATE'
      `);

      if (mutLogsRes && mutLogsRes.rows) {
        for (const row of mutLogsRes.rows) {
          let parsedDetails = {};
          try {
            parsedDetails = typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || {});
          } catch {
            parsedDetails = {};
          }

          const shift = parsedDetails.shift;
          const tanggal = parsedDetails.tanggal;
          if (!shift || !tanggal || !row.outlet_id) continue;

          if (row.description.includes('(69 item)') || parsedDetails.total_masuk === undefined) {
            const actualMut = await pool.query(
              `SELECT 
                 COUNT(*)::int AS cnt,
                 COALESCE(SUM(sm.masuk), 0)::int AS total_masuk,
                 COALESCE(SUM(sm.keluar), 0)::int AS total_keluar,
                 ARRAY_REMOVE(ARRAY_AGG(p.nama || ' (M:+' || sm.masuk || ', K:-' || sm.keluar || ', SAK:' || sm.sak || ')'), NULL) AS items_summary
               FROM stock_mutations sm
               JOIN products p ON sm.product_id = p.id
               WHERE sm.outlet_id = $1 AND sm.tanggal = $2 AND sm.shift = $3
                 AND (sm.masuk > 0 OR sm.keluar > 0)`,
              [row.outlet_id, tanggal, shift]
            );

            const stat = actualMut.rows[0];
            if (!stat || stat.cnt === 0) {
              // Seluruh baris pada shift ini adalah mass-zero tak sengaja yang sudah dihapus
              await pool.query('DELETE FROM audit_logs WHERE id = $1', [row.id]);
            } else {
              const newDesc = `Mencatat mutasi Shift ${shift} (${tanggal}): ${stat.cnt} bahan bergerak (Masuk: +${stat.total_masuk}, Keluar: -${stat.total_keluar} unit).`;
              const newDetails = {
                tanggal,
                shift,
                items_count: stat.cnt,
                total_masuk: stat.total_masuk,
                total_keluar: stat.total_keluar,
                rincian_bahan: (stat.items_summary || []).slice(0, 15)
              };
              await pool.query(
                'UPDATE audit_logs SET description = $1, details = $2 WHERE id = $3',
                [newDesc, JSON.stringify(newDetails), row.id]
              );
            }
          }
        }
      }

      // 2. Backfill Stok Opname yang belum tercatat di audit_logs
      const opnamesRes = await pool.query(`
        SELECT so.id, so.kode, so.outlet_id, TO_CHAR(so.tanggal, 'YYYY-MM-DD') AS tgl,
               so.status, so.created_by, so.created_at,
               o.nama AS outlet_name, u.nama AS user_name, u.role AS user_role,
               COUNT(soi.id)::int AS total_items,
               COUNT(CASE WHEN soi.selisih <> 0 THEN 1 END)::int AS selisih_items
        FROM stock_opnames so
        JOIN outlets o ON so.outlet_id = o.id
        LEFT JOIN users u ON so.created_by = u.id
        LEFT JOIN stock_opname_items soi ON soi.opname_id = so.id
        GROUP BY so.id, o.nama, u.nama, u.role
      `);

      if (opnamesRes && opnamesRes.rows) {
        for (const op of opnamesRes.rows) {
          const actionType = op.status === 'FINAL' ? 'FINALIZE' : 'CREATE';
          const exists = await pool.query(
            `SELECT id FROM audit_logs WHERE module = 'OPNAME' AND description LIKE $1 LIMIT 1`,
            [`%${op.kode}%`]
          );
          if (exists.rows.length === 0) {
            const desc = op.status === 'FINAL'
              ? `Finalisasi Stok Opname ${op.kode} (${op.outlet_name}) tanggal ${op.tgl} — ${op.selisih_items} item selisih dari ${op.total_items} bahan.`
              : `Membuat draf Stok Opname ${op.kode} (${op.outlet_name}) untuk tanggal ${op.tgl}.`;
            await pool.query(
              `INSERT INTO audit_logs (user_id, user_name, role, outlet_id, outlet_name, module, action, description, details, created_at)
               VALUES ($1, $2, $3, $4, $5, 'OPNAME', $6, $7, $8, COALESCE($9, CURRENT_TIMESTAMP))`,
              [
                op.created_by || 1,
                op.user_name || 'Admin Pusat',
                op.user_role || 'ADMIN_PUSAT',
                op.outlet_id,
                op.outlet_name,
                actionType,
                desc,
                JSON.stringify({
                  kode_opname: op.kode,
                  tanggal: op.tgl,
                  status: op.status,
                  total_produk_diaudit: op.total_items,
                  produk_berselisih: op.selisih_items
                }),
                op.created_at
              ]
            );
          }
        }
      }

      // 3. Backfill Laporan Defect yang belum tercatat di audit_logs
      const defectsRes = await pool.query(`
        SELECT d.id, d.outlet_id, d.product_id, d.qty, d.deskripsi, d.status, d.reported_by, d.created_at,
               p.nama AS product_name, p.satuan, o.nama AS outlet_name, u.nama AS user_name, u.role AS user_role
        FROM defect_reports d
        JOIN products p ON d.product_id = p.id
        JOIN outlets o ON d.outlet_id = o.id
        LEFT JOIN users u ON d.reported_by = u.id
      `);

      if (defectsRes && defectsRes.rows) {
        for (const df of defectsRes.rows) {
          const marker = `[DEF-#${df.id}]`;
          const exists = await pool.query(
            `SELECT id FROM audit_logs WHERE module = 'DEFECT' AND (description LIKE $1 OR details LIKE $2) LIMIT 1`,
            [`%${marker}%`, `%"defect_id":${df.id}%`]
          );
          if (exists.rows.length === 0) {
            const actionType = df.status === 'DISETUJUI' ? 'APPROVE' : df.status === 'DITOLAK' ? 'REJECT' : 'CREATE';
            const desc = df.status === 'DISETUJUI'
              ? `Laporan Defect ${df.product_name} (${df.qty} ${df.satuan}) di ${df.outlet_name} DISETUJUI — Stok otomatis dipotong.`
              : df.status === 'DITOLAK'
                ? `Laporan Defect ${df.product_name} (${df.qty} ${df.satuan}) di ${df.outlet_name} DITOLAK.`
                : `Melaporkan barang defect/rusak: ${df.product_name} (${df.qty} ${df.satuan}) di ${df.outlet_name}.`;
            await pool.query(
              `INSERT INTO audit_logs (user_id, user_name, role, outlet_id, outlet_name, module, action, description, details, created_at)
               VALUES ($1, $2, $3, $4, $5, 'DEFECT', $6, $7, $8, COALESCE($9, CURRENT_TIMESTAMP))`,
              [
                df.reported_by || 1,
                df.user_name || 'Staf Operasional',
                df.user_role || 'STAF_CABANG',
                df.outlet_id,
                df.outlet_name,
                actionType,
                desc,
                JSON.stringify({
                  defect_id: df.id,
                  produk: df.product_name,
                  jumlah: `${df.qty} ${df.satuan}`,
                  status: df.status,
                  alasan_kerusakan: df.deskripsi || '-'
                }),
                df.created_at
              ]
            );
          }
        }
      }

      // 4. Backfill Tiket Permintaan & Pengambilan Cito yang belum tercatat di audit_logs
      const reqsRes = await pool.query(`
        SELECT rt.id, rt.kode_tiket, rt.outlet_id, rt.status, rt.requested_by AS created_by, rt.created_at,
               o.nama AS outlet_name, u.nama AS user_name, u.role AS user_role,
               COUNT(rti.id)::int AS item_count,
               COALESCE(SUM(rti.qty_diminta), 0)::int AS total_diminta,
               COALESCE(SUM(rti.qty_dikirim), 0)::int AS total_dikirim
        FROM restock_tickets rt
        JOIN outlets o ON rt.outlet_id = o.id
        LEFT JOIN users u ON rt.requested_by = u.id
        LEFT JOIN restock_ticket_items rti ON rti.ticket_id = rt.id
        GROUP BY rt.id, o.nama, u.nama, u.role
      `);

      if (reqsRes && reqsRes.rows) {
        for (const rq of reqsRes.rows) {
          const exists = await pool.query(
            `SELECT id FROM audit_logs WHERE module = 'PERMINTAAN' AND description LIKE $1 LIMIT 1`,
            [`%${rq.kode_tiket}%`]
          );
          if (exists.rows.length === 0) {
            const isCito = String(rq.kode_tiket || '').startsWith('CITO');
            const actionType = isCito ? 'CITO' : (rq.status === 'SELESAI' || rq.status === 'DIKIRIM') ? 'APPROVE' : 'CREATE';
            const desc = isCito
              ? `Pengambilan Darurat (CITO) ${rq.kode_tiket} untuk ${rq.outlet_name} (${rq.item_count} jenis bahan, ${rq.total_dikirim || rq.total_diminta} unit).`
              : `Tiket Permintaan Stok ${rq.kode_tiket} (${rq.outlet_name}) — Status: ${rq.status} (${rq.item_count} item, ${rq.total_dikirim || rq.total_diminta} unit).`;
            await pool.query(
              `INSERT INTO audit_logs (user_id, user_name, role, outlet_id, outlet_name, module, action, description, details, created_at)
               VALUES ($1, $2, $3, $4, $5, 'PERMINTAAN', $6, $7, $8, COALESCE($9, CURRENT_TIMESTAMP))`,
              [
                rq.created_by || 1,
                rq.user_name || 'Staf Operasional',
                rq.user_role || 'STAF_CABANG',
                rq.outlet_id,
                rq.outlet_name,
                actionType,
                desc,
                JSON.stringify({
                  kode_tiket: rq.kode_tiket,
                  cabang_pemohon: rq.outlet_name,
                  status_tiket: rq.status,
                  tipe_permintaan: isCito ? 'DARURAT (CITO)' : 'REGULER',
                  jumlah_jenis_barang: rq.item_count,
                  total_unit: rq.total_dikirim || rq.total_diminta
                }),
                rq.created_at
              ]
            );
          }
        }
      }

      // 5. Backfill Batch Kadaluarsa (FEFO) yang belum tercatat di audit_logs
      const batchesRes = await pool.query(`
        SELECT b.id, b.batch_no, b.outlet_id, b.qty, TO_CHAR(b.tanggal_masuk, 'YYYY-MM-DD') AS tgl_masuk,
               TO_CHAR(b.expired_date, 'YYYY-MM-DD') AS exp_date, b.catatan, b.created_by, b.created_at,
               p.nama AS product_name, p.satuan, o.nama AS outlet_name, u.nama AS user_name, u.role AS user_role
        FROM product_batches b
        JOIN products p ON b.product_id = p.id
        JOIN outlets o ON b.outlet_id = o.id
        LEFT JOIN users u ON b.created_by = u.id
      `);

      if (batchesRes && batchesRes.rows) {
        for (const bt of batchesRes.rows) {
          const exists = await pool.query(
            `SELECT id FROM audit_logs WHERE module = 'KADALUARSA' AND description LIKE $1 LIMIT 1`,
            [`%${bt.batch_no}%`]
          );
          if (exists.rows.length === 0) {
            const desc = `Mencatat Batch FEFO ${bt.batch_no} (${bt.product_name} - ${bt.qty} ${bt.satuan}) di ${bt.outlet_name}, Exp: ${bt.exp_date}.`;
            await pool.query(
              `INSERT INTO audit_logs (user_id, user_name, role, outlet_id, outlet_name, module, action, description, details, created_at)
               VALUES ($1, $2, $3, $4, $5, 'KADALUARSA', 'CREATE', $6, $7, COALESCE($8, CURRENT_TIMESTAMP))`,
              [
                bt.created_by || 1,
                bt.user_name || 'Staf Operasional',
                bt.user_role || 'STAF_CABANG',
                bt.outlet_id,
                bt.outlet_name,
                desc,
                JSON.stringify({
                  nomor_batch: bt.batch_no,
                  produk: bt.product_name,
                  jumlah: `${bt.qty} ${bt.satuan}`,
                  tanggal_masuk: bt.tgl_masuk,
                  tanggal_kadaluarsa: bt.exp_date,
                  catatan: bt.catatan || '-'
                }),
                bt.created_at
              ]
            );
          }
        }
      }
    } catch (err) {
      console.error('AuditService.syncAndBackfillAuditLogs warning:', err.message);
    }
  }

  static _buildWhereClause({ module = null, action = null, userId = null, outletId = null, startDate = null, endDate = null, search = '' }) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (module) {
      conditions.push(`module = $${paramIndex++}`);
      values.push(module);
    }

    if (action) {
      conditions.push(`action = $${paramIndex++}`);
      values.push(action);
    }

    if (userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(parseInt(userId));
    }

    if (outletId) {
      conditions.push(`outlet_id = $${paramIndex++}`);
      values.push(parseInt(outletId));
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}::timestamp`);
      values.push(`${startDate} 00:00:00`);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}::timestamp`);
      values.push(`${endDate} 23:59:59`);
    }

    if (search && search.trim() !== '') {
      conditions.push(`(
        user_name ILIKE $${paramIndex} OR 
        description ILIKE $${paramIndex} OR 
        module ILIKE $${paramIndex} OR 
        outlet_name ILIKE $${paramIndex}
      )`);
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values, paramIndex };
  }

  /**
   * Ambil data audit logs dengan pagination & filter
   */
  static async getAuditLogs({
    page = 1,
    limit = 20,
    module = null,
    action = null,
    userId = null,
    outletId = null,
    startDate = null,
    endDate = null,
    search = ''
  }) {
    await this.syncAndBackfillAuditLogs();

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const { whereClause, values, paramIndex: nextIdx } = this._buildWhereClause({
      module,
      action,
      userId,
      outletId,
      startDate,
      endDate,
      search
    });
    let paramIndex = nextIdx;

    // Count query
    const countQuery = `SELECT COUNT(*) FROM audit_logs ${whereClause}`;
    const countRes = await pool.query(countQuery, values);
    const total = parseInt(countRes.rows[0].count);

    // Data query
    const dataQuery = `
      SELECT id, user_id, user_name, role, outlet_id, outlet_name, 
             module, action, description, details, ip_address, created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    const dataRes = await pool.query(dataQuery, [...values, parseInt(limit), offset]);

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

  /**
   * Ringkasan statistik audit untuk kartu metrik (mendukung filter aktif)
   */
  static async getAuditStats(filters = {}) {
    await this.syncAndBackfillAuditLogs();

    const { whereClause, values } = this._buildWhereClause(filters);

    const summaryRes = await pool.query(
      `
      SELECT 
        COUNT(*) AS total_records,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) AS total_today,
        COUNT(CASE WHEN action IN ('DELETE', 'CANCEL', 'REJECT', 'SHIFT_UNLOCK', 'CITO', 'FINALIZE') THEN 1 END) AS critical_actions,
        COUNT(CASE WHEN module IN ('OPNAME', 'DEFECT', 'KADALUARSA') THEN 1 END) AS stock_adjustments,
        COUNT(CASE WHEN module = 'OPNAME' THEN 1 END) AS opname_count,
        COUNT(CASE WHEN module IN ('DEFECT', 'KADALUARSA') THEN 1 END) AS defect_count,
        COUNT(CASE WHEN action = 'SHIFT_CLOSE' THEN 1 END) AS shift_close_count,
        COUNT(DISTINCT COALESCE(user_id::text, user_name)) AS active_users,
        COUNT(DISTINCT outlet_id) AS active_outlets
      FROM audit_logs
      ${whereClause}
      `,
      values
    );

    const topModuleRes = await pool.query(
      `
      SELECT module, COUNT(*) as count 
      FROM audit_logs 
      ${whereClause}
      GROUP BY module 
      ORDER BY count DESC 
      LIMIT 1
      `,
      values
    );

    const row = summaryRes.rows[0] || {};
    return {
      total_records: parseInt(row.total_records || 0),
      total_today: parseInt(row.total_today || 0),
      critical_actions: parseInt(row.critical_actions || 0),
      stock_adjustments: parseInt(row.stock_adjustments || 0),
      opname_count: parseInt(row.opname_count || 0),
      defect_count: parseInt(row.defect_count || 0),
      shift_close_count: parseInt(row.shift_close_count || 0),
      active_users: parseInt(row.active_users || 0),
      active_outlets: parseInt(row.active_outlets || 0),
      top_module: topModuleRes.rows[0]?.module || 'OPERASIONAL'
    };
  }
}

module.exports = AuditService;
