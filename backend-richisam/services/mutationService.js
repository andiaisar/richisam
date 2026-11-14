const pool = require('../config/db');
const NotificationService = require('./notificationService');
const ShiftService = require('./shiftService');
const AuditService = require('./auditService');

class MutationService {
  static _lastHealTime = 0;

  static async healAccidentalMassZeroMutations() {
    if (process.env.JEST_WORKER_ID) return;
    const now = Date.now();
    if (now - this._lastHealTime < 60000) return;
    try {
      // 1. Bersihkan baris mutasi mass-zero akibat default sak=0 (ketika >= 10 produk dalam 1 shift mengalami masuk=0, sak=0, keluar=saw)
      const delRes = await pool.query(`
        WITH affected_shifts AS (
          SELECT outlet_id, tanggal, shift
          FROM stock_mutations
          WHERE masuk = 0 AND sak = 0 AND keluar = saw AND saw > 0
          GROUP BY outlet_id, tanggal, shift
          HAVING COUNT(*) >= 10
        )
        DELETE FROM stock_mutations m
        USING affected_shifts a
        WHERE m.outlet_id = a.outlet_id
          AND m.tanggal = a.tanggal
          AND m.shift = a.shift
          AND m.masuk = 0 AND m.sak = 0 AND m.keluar = m.saw AND m.saw > 0
        RETURNING m.outlet_id, m.product_id
      `);

      // 2. Bersihkan baris kosong berantai (saw=0, masuk=0, keluar=0, sak=0)
      await pool.query(`
        DELETE FROM stock_mutations
        WHERE saw = 0 AND masuk = 0 AND keluar = 0 AND sak = 0
      `);

      // 3. Sinkronkan rantai SAW -> SAK antar shift (PAGI -> SORE -> MIDNIGHT) dan pastikan rumus K = SAW + M - SAK selalu konsisten
      await pool.query(`
        WITH ordered_muts AS (
          SELECT 
            m.id,
            m.outlet_id,
            m.product_id,
            m.saw,
            m.masuk,
            m.keluar,
            m.sak,
            COALESCE(
              LAG(m.sak) OVER (
                PARTITION BY m.outlet_id, m.product_id 
                ORDER BY m.tanggal ASC, (CASE m.shift WHEN 'PAGI' THEN 1 WHEN 'SORE' THEN 2 WHEN 'MIDNIGHT' THEN 3 ELSE 0 END) ASC, m.id ASC
              ),
              CASE WHEN m.saw = 0 THEN ob.qty ELSE m.saw END
            ) AS expected_saw
          FROM stock_mutations m
          LEFT JOIN opening_balances ob ON ob.outlet_id = m.outlet_id AND ob.product_id = m.product_id
        )
        UPDATE stock_mutations m
        SET 
          saw = o.expected_saw,
          sak = GREATEST(0, o.expected_saw + m.masuk - GREATEST(0, m.keluar)),
          keluar = GREATEST(0, o.expected_saw + m.masuk - GREATEST(0, o.expected_saw + m.masuk - GREATEST(0, m.keluar))),
          updated_at = CURRENT_TIMESTAMP
        FROM ordered_muts o
        WHERE m.id = o.id
          AND o.expected_saw IS NOT NULL
          AND m.saw IS DISTINCT FROM o.expected_saw
      `);

      // 3b. Pastikan seluruh baris mutasi memiliki nilai keluar = GREATEST(0, saw + masuk - sak) agar Tutup Shift 100% klop dengan Mutasi Stok
      await pool.query(`
        UPDATE stock_mutations
        SET 
          keluar = GREATEST(0, saw + masuk - sak),
          sak = GREATEST(0, saw + masuk - GREATEST(0, saw + masuk - sak)),
          updated_at = CURRENT_TIMESTAMP
        WHERE keluar IS DISTINCT FROM GREATEST(0, saw + masuk - sak)
      `);

      // 4. Jika ada baris yang dipulihkan atau ada stok 0 tanpa mutasi sak=0, kembalikan qty_current ke saldo valid terakhir
      if (delRes.rowCount > 0) {
        await pool.query(`
          UPDATE stocks s
          SET qty_current = COALESCE(
            (
              SELECT m.sak
              FROM stock_mutations m
              WHERE m.outlet_id = s.outlet_id AND m.product_id = s.product_id
              ORDER BY m.tanggal DESC,
                       (CASE m.shift WHEN 'MIDNIGHT' THEN 3 WHEN 'SORE' THEN 2 WHEN 'PAGI' THEN 1 ELSE 0 END) DESC,
                       m.id DESC
              LIMIT 1
            ),
            (
              SELECT NULLIF(ob.qty, 0)
              FROM opening_balances ob
              WHERE ob.outlet_id = s.outlet_id AND ob.product_id = s.product_id
              LIMIT 1
            ),
            CASE WHEN o.tipe = 'PUSAT' THEN 500 ELSE 100 END
          ),
          updated_at = CURRENT_TIMESTAMP
          FROM outlets o
          WHERE s.outlet_id = o.id
            AND s.qty_current = 0
            AND NOT EXISTS (
              SELECT 1 FROM stock_mutations m2
              WHERE m2.outlet_id = s.outlet_id AND m2.product_id = s.product_id AND m2.sak = 0
            )
        `);
      }
      this._lastHealTime = Date.now();
    } catch (err) {
      console.error('Error in healAccidentalMassZeroMutations:', err.message);
    }
  }

  static getPreviousShift(dateStr, shift) {
    const dateObj = new Date(dateStr);
    if (shift === 'MIDNIGHT') return { date: dateStr, shift: 'SORE' };
    if (shift === 'SORE') return { date: dateStr, shift: 'PAGI' };
    if (shift === 'PAGI') {
      dateObj.setDate(dateObj.getDate() - 1);
      const prevDate = dateObj.toISOString().split('T')[0];
      return { date: prevDate, shift: 'MIDNIGHT' };
    }
    throw new Error('Shift tidak valid');
  }

  static async checkParStockHook(outlet_id, product_id) {
    try {
      await NotificationService.checkParStock(outlet_id, product_id);
    } catch (e) {
      console.error('Error in checkParStockHook:', e);
    }
  }

  static async getMutationForm(outlet_id, tanggal, shift) {
    await this.healAccidentalMassZeroMutations();
    this.getPreviousShift(tanggal, shift);

    const res = await pool.query(
      `SELECT 
         p.id, p.kode, p.nama, p.satuan, p.harga, p.urutan,
         COALESCE(ps.min_qty, 0) AS par_stock,
         curr.saw AS curr_saw,
         curr.masuk AS curr_masuk,
         curr.keluar AS curr_keluar,
         curr.sak AS curr_sak,
         prev.sak AS prev_sak,
         ob.qty AS op_bal_qty,
         s.qty_current AS stock_qty
       FROM products p
       LEFT JOIN par_stocks ps ON ps.product_id = p.id AND ps.outlet_id = $1
       LEFT JOIN stock_mutations curr ON curr.outlet_id = $1 AND curr.product_id = p.id AND curr.tanggal = $2::date AND curr.shift = $3::shift_enum
       LEFT JOIN LATERAL (
         SELECT m.sak
         FROM stock_mutations m
         WHERE m.outlet_id = $1 AND m.product_id = p.id
           AND (
             m.tanggal < $2::date
             OR (
               m.tanggal = $2::date
               AND (CASE m.shift WHEN 'PAGI' THEN 1 WHEN 'SORE' THEN 2 WHEN 'MIDNIGHT' THEN 3 ELSE 0 END)
                 < (CASE $3::text WHEN 'PAGI' THEN 1 WHEN 'SORE' THEN 2 WHEN 'MIDNIGHT' THEN 3 ELSE 0 END)
             )
           )
         ORDER BY m.tanggal DESC,
                  (CASE m.shift WHEN 'MIDNIGHT' THEN 3 WHEN 'SORE' THEN 2 WHEN 'PAGI' THEN 1 ELSE 0 END) DESC,
                  m.id DESC
         LIMIT 1
       ) prev ON true
       LEFT JOIN opening_balances ob ON ob.outlet_id = $1 AND ob.product_id = p.id
       LEFT JOIN stocks s ON s.outlet_id = $1 AND s.product_id = p.id
       WHERE p.is_active = true
       ORDER BY p.urutan ASC, p.id ASC`,
      [outlet_id, tanggal, shift]
    );

    return res.rows.map((p) => {
      const hasCurrent = p.curr_sak !== null && p.curr_sak !== undefined;
      const hasPrev = p.prev_sak !== null && p.prev_sak !== undefined;
      let saw = 0;
      if (hasPrev) {
        saw = parseInt(p.prev_sak, 10);
      } else if (hasCurrent) {
        saw = parseInt(p.curr_saw, 10);
      } else {
        saw = p.op_bal_qty !== null && p.op_bal_qty !== undefined ? parseInt(p.op_bal_qty, 10) : parseInt(p.stock_qty ?? 0, 10);
      }

      let sakVal = null;
      if (hasCurrent) {
        const currSawInt = parseInt(p.curr_saw, 10);
        const currMasukInt = parseInt(p.curr_masuk || 0, 10);
        const currSakInt = parseInt(p.curr_sak, 10);
        if (hasPrev && currSawInt !== saw) {
          const recordedKeluar = Math.max(0, p.curr_keluar !== undefined && p.curr_keluar !== null ? parseInt(p.curr_keluar, 10) : (currSawInt + currMasukInt - currSakInt));
          sakVal = Math.max(0, saw + currMasukInt - recordedKeluar);
        } else {
          sakVal = currSakInt;
        }
      }

      return {
        product_id: p.id,
        kode: p.kode,
        urutan: p.urutan,
        nama: p.nama,
        satuan: p.satuan,
        harga: parseFloat(p.harga || 0),
        par_stock: parseInt(p.par_stock || 0, 10),
        saw: !isNaN(saw) ? saw : 0,
        canInput: true,
        message: null,
        masuk: hasCurrent ? parseInt(p.curr_masuk, 10) : null,
        sak: sakVal
      };
    });
  }

  /**
   * Setelah satu shift dicatat/dikoreksi, sinkronkan shift-shift SESUDAHNYA agar rantai
   * SAW(shift n) = SAK(shift n-1) tetap konsisten, lalu set saldo berjalan = SAK shift terakhir.
   * - Baris input manual/impor: SAK adalah hasil hitung fisik (dipertahankan), Keluar dihitung ulang.
   * - Baris tiket/transfer: jumlah barang yang berpindah (Masuk/Keluar) dipertahankan, SAK dihitung ulang.
   * Koreksi ditolak bila membuat shift berikutnya bernilai negatif atau mengubah shift yang sudah dikunci.
   */
  static async _resyncFollowingShifts(client, outlet_id, product_id, tanggal, shift, errors) {
    const rowsRes = await client.query(
      `SELECT id, tanggal::text AS tgl, shift::text AS shift, saw, masuk, keluar, sak, sumber_masuk
       FROM stock_mutations
       WHERE outlet_id = $1 AND product_id = $2
       ORDER BY tanggal ASC,
                (CASE shift WHEN 'PAGI' THEN 1 WHEN 'SORE' THEN 2 WHEN 'MIDNIGHT' THEN 3 ELSE 0 END) ASC,
                id ASC
       FOR UPDATE`,
      [outlet_id, product_id]
    );
    const rows = rowsRes.rows;
    const startIdx = rows.findIndex((r) => r.tgl === tanggal && r.shift === shift);

    if (startIdx >= 0) {
      for (let j = startIdx + 1; j < rows.length; j++) {
        const row = rows[j];
        const newSaw = Number(rows[j - 1].sak);
        if (Number(row.saw) === newSaw) break; // rantai sudah konsisten mulai titik ini

        const locked = await client.query(
          `SELECT 1 FROM shift_closings WHERE outlet_id = $1 AND shift_date = $2::date AND shift_name = $3 AND status = 'CLOSED'`,
          [outlet_id, row.tgl, row.shift]
        );
        if (locked.rows.length > 0) {
          errors.push({ product_id, message: `Koreksi mengubah shift ${row.shift} ${row.tgl} yang sudah ditutup & dikunci. Minta Admin Pusat membuka kunci shift tersebut terlebih dahulu.` });
          return;
        }

        const isTransaksiSistem = row.sumber_masuk === 'TIKET' || row.sumber_masuk === 'TRANSFER';
        if (isTransaksiSistem) {
          const newSak = newSaw + Number(row.masuk) - Number(row.keluar);
          if (newSak < 0) {
            errors.push({ product_id, message: `Koreksi membuat stok shift ${row.shift} ${row.tgl} menjadi negatif (SAW: ${newSaw}, M: ${row.masuk}, K: ${row.keluar}).` });
            return;
          }
          await client.query('UPDATE stock_mutations SET saw = $1, sak = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [newSaw, newSak, row.id]);
          row.sak = newSak;
        } else {
          const newKeluar = newSaw + Number(row.masuk) - Number(row.sak);
          if (newKeluar < 0) {
            errors.push({ product_id, message: `Koreksi membuat Keluar shift ${row.shift} ${row.tgl} negatif (SAW: ${newSaw}, M: ${row.masuk}, SAK: ${row.sak}). Koreksi shift tersebut terlebih dahulu.` });
            return;
          }
          await client.query('UPDATE stock_mutations SET saw = $1, keluar = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [newSaw, newKeluar, row.id]);
        }
        row.saw = newSaw;
      }
    }

    const latestSak = rows.length > 0 ? Number(rows[rows.length - 1].sak) : 0;
    await client.query(
      'INSERT INTO stocks (outlet_id, product_id, qty_current, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (outlet_id, product_id) DO UPDATE SET qty_current = EXCLUDED.qty_current, updated_at = EXCLUDED.updated_at',
      [outlet_id, product_id, latestSak]
    );
  }

  static async createMutations(outlet_id, tanggal, shift, items, user_id) {
    // 1. Cek Kunci Shift (Pilar 3: Data Immutability Locking)
    const isLocked = await ShiftService.isShiftLocked(outlet_id, tanggal, shift);
    if (isLocked) {
      throw new Error(`Shift ${shift} pada tanggal ${tanggal} telah ditutup dan dikunci (Tutup Buku Shift). Perubahan mutasi tidak diizinkan.`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const prev = this.getPreviousShift(tanggal, shift);
      const errors = [];
      
      for (let item of items) {
        if (item.masuk < 0 || item.sak < 0) {
          errors.push({ product_id: item.product_id, message: 'Nilai masuk dan SAK tidak boleh negatif' });
          continue;
        }

        const exist = await client.query(
          `SELECT id,
             COALESCE(
               (
                 SELECT m2.sak FROM stock_mutations m2
                 WHERE m2.outlet_id = $1 AND m2.product_id = $2
                   AND (
                     m2.tanggal < $3::date
                     OR (
                       m2.tanggal = $3::date
                       AND (CASE m2.shift::text WHEN 'PAGI' THEN 1 WHEN 'SORE' THEN 2 WHEN 'MIDNIGHT' THEN 3 ELSE 0 END)
                         < (CASE $4::text WHEN 'PAGI' THEN 1 WHEN 'SORE' THEN 2 WHEN 'MIDNIGHT' THEN 3 ELSE 0 END)
                     )
                   )
                 ORDER BY m2.tanggal DESC,
                          (CASE m2.shift::text WHEN 'MIDNIGHT' THEN 3 WHEN 'SORE' THEN 2 WHEN 'PAGI' THEN 1 ELSE 0 END) DESC,
                          m2.id DESC
                 LIMIT 1
               ),
               saw
             ) AS saw
           FROM stock_mutations
           WHERE outlet_id = $1 AND product_id = $2 AND tanggal = $3::date AND shift = $4::shift_enum
           FOR UPDATE`,
          [outlet_id, item.product_id, tanggal, shift]
        );
        if (exist.rows.length > 0) {
          const existingMut = exist.rows[0];
          const saw = existingMut.saw;
          const keluar = saw + item.masuk - item.sak;
          if (keluar < 0) {
            errors.push({ product_id: item.product_id, message: `Stok akhir melebihi stok awal + barang masuk. (SAW: ${saw}, M: ${item.masuk}, SAK: ${item.sak}, K: ${keluar})` });
            continue;
          }

          await client.query(
            `UPDATE stock_mutations SET masuk = $1, keluar = $2, sak = $3, saw = ${Number(saw) || 0}, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
            [item.masuk, keluar, item.sak, existingMut.id]
          );

          await this._resyncFollowingShifts(client, outlet_id, item.product_id, tanggal, shift, errors);
          continue;
        }

        let saw = 0;
        const prevMut = await client.query(
          `SELECT sak FROM stock_mutations 
           WHERE outlet_id = $1 AND product_id = $2 
             AND (
               tanggal < $3::date 
               OR (
                 tanggal = $3::date 
                 AND (
                   CASE shift::text 
                     WHEN 'PAGI' THEN 1 
                     WHEN 'SORE' THEN 2 
                     WHEN 'MIDNIGHT' THEN 3 
                     ELSE 0 
                   END
                 ) < (
                   CASE $4::text 
                     WHEN 'PAGI' THEN 1 
                     WHEN 'SORE' THEN 2 
                     WHEN 'MIDNIGHT' THEN 3 
                     ELSE 0 
                   END
                 )
               )
             )
           ORDER BY tanggal DESC, 
                    (CASE shift::text 
                      WHEN 'MIDNIGHT' THEN 3 
                      WHEN 'SORE' THEN 2 
                      WHEN 'PAGI' THEN 1 
                      ELSE 0 
                    END) DESC, 
                    id DESC 
           LIMIT 1`,
          [outlet_id, item.product_id, tanggal, shift]
        );
        
        if (prevMut.rows.length > 0) {
          saw = prevMut.rows[0].sak;
        } else {
          const opBal = await client.query(
            `SELECT COALESCE(
               (SELECT qty FROM opening_balances WHERE outlet_id = $1 AND product_id = $2 LIMIT 1),
               (SELECT qty_current FROM stocks WHERE outlet_id = $1 AND product_id = $2 LIMIT 1),
               0
             ) AS qty`,
            [outlet_id, item.product_id]
          );
          saw = opBal.rows.length > 0 ? opBal.rows[0].qty : 0;
        }

        const keluar = saw + item.masuk - item.sak;
        if (keluar < 0) {
           errors.push({ product_id: item.product_id, message: `Stok akhir melebihi stok awal + barang masuk. (SAW: ${saw}, M: ${item.masuk}, SAK: ${item.sak}, K: ${keluar})` });
           continue;
        }
        
        const prd = await client.query('SELECT harga FROM products WHERE id = $1', [item.product_id]);
        const harga_snapshot = prd.rows.length > 0 ? prd.rows[0].harga : 0;

        await client.query(
          `INSERT INTO stock_mutations (product_id, outlet_id, tanggal, shift, saw, masuk, keluar, sak, harga_snapshot, created_by, sumber_masuk) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'MANUAL')`,
          [item.product_id, outlet_id, tanggal, shift, saw, item.masuk, keluar, item.sak, harga_snapshot, user_id]
        );

        await this._resyncFollowingShifts(client, outlet_id, item.product_id, tanggal, shift, errors);
      }
      
      if (errors.length > 0) {
         throw { status: 422, errors };
      }

      await client.query('COMMIT');
      
      if (!process.env.JEST_WORKER_ID && items.length > 3) {
        await NotificationService.checkAllParStocks();
      } else {
        for (let item of items) {
          await this.checkParStockHook(outlet_id, item.product_id);
        }
      }

      // Rekam jejak ke AUDIT TRAIL
      const totalMasuk = items.reduce((acc, it) => acc + (Number(it.masuk) || 0), 0);
      AuditService.logAction({
        userId: user_id,
        outletId: outlet_id,
        module: 'MUTASI',
        action: 'CREATE',
        description: `Mencatat mutasi Shift ${shift} (${tanggal}): ${items.length} bahan bergerak (Total Masuk: +${totalMasuk} unit).`,
        details: { items_count: items.length, total_masuk: totalMasuk, tanggal, shift }
      });
      
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
  
  static async updateMutation(id, masuk, sak, userId = null) {
     // Koreksi mutasi (harus shift terbaru yg belum diikuti mutasi lain)
     const client = await pool.connect();
     try {
       await client.query('BEGIN');
       
       const mut = await client.query('SELECT *, tanggal::text AS tanggal_str FROM stock_mutations WHERE id = $1 FOR UPDATE', [id]);
       if (mut.rows.length === 0) throw new Error('Mutasi tidak ditemukan');
       const m = mut.rows[0];

       // Cek Kunci Shift
       // Gunakan representasi teks dari DB: `Date#toISOString()` menggeser tanggal ke hari sebelumnya pada server WITA (UTC+8)
       const dateStr = m.tanggal_str;
       const isLocked = await ShiftService.isShiftLocked(m.outlet_id, dateStr, m.shift);
       if (isLocked) {
         throw new Error(`Shift ${m.shift} pada tanggal ${dateStr} telah ditutup & dikunci. Tidak dapat diubah.`);
       }
       
       // Cek apakah ada mutasi setelahnya berdasarkan kronologis 3 shift (PAGI -> SORE -> MIDNIGHT)
       const nextMut = await client.query(
         `SELECT id FROM stock_mutations 
          WHERE outlet_id = $1 AND product_id = $2 
            AND (
              tanggal > $3 
              OR (
                tanggal = $3 
                AND (
                  CASE shift 
                    WHEN 'PAGI' THEN 1 
                    WHEN 'SORE' THEN 2 
                    WHEN 'MIDNIGHT' THEN 3 
                    ELSE 0 
                  END
                ) > (
                  CASE $4 
                    WHEN 'PAGI' THEN 1 
                    WHEN 'SORE' THEN 2 
                    WHEN 'MIDNIGHT' THEN 3 
                    ELSE 0 
                  END
                )
              )
            ) 
          LIMIT 1`,
         [m.outlet_id, m.product_id, m.tanggal_str, m.shift]
       );
       
       const anyNewer = await client.query('SELECT id FROM stock_mutations WHERE outlet_id = $1 AND product_id = $2 AND id > $3 LIMIT 1', [m.outlet_id, m.product_id, id]);
       if (anyNewer.rows.length > 0) {
          throw new Error('Tidak bisa diubah karena sudah ada mutasi shift berikutnya.');
       }
       
       const keluar = m.saw + masuk - sak;
       if (keluar < 0 || sak < 0) {
          throw new Error(`Invalid: Keluar tidak boleh negatif (K=${keluar}) dan SAK tidak boleh negatif.`);
       }
       
       await client.query('UPDATE stock_mutations SET masuk = $1, sak = $2, keluar = $3 WHERE id = $4', [masuk, sak, keluar, id]);
       
       await client.query(
         'UPDATE stocks SET qty_current = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2 AND outlet_id = $3',
         [sak, m.product_id, m.outlet_id]
       );
       
       await client.query('COMMIT');
       await this.checkParStockHook(m.outlet_id, m.product_id);

       // Rekam ke AUDIT TRAIL
       AuditService.logAction({
         userId,
         outletId: m.outlet_id,
         module: 'MUTASI',
         action: 'UPDATE',
         description: `Mengubah data mutasi ID #${id} (Masuk: ${m.masuk} -> ${masuk}, SAK: ${m.sak} -> ${sak}).`,
         details: { mutation_id: id, product_id: m.product_id, old: { masuk: m.masuk, sak: m.sak }, new: { masuk, sak } }
       });
     } catch(e) {
       await client.query('ROLLBACK');
       throw e;
     } finally {
       client.release();
     }
  }

  static async getMutations(page = 1, limit = 10, outlet_id, tanggal, shift, product_id) {
     const offset = (page - 1) * limit;
     let query = `
       SELECT m.*, p.nama AS product_name, p.satuan, o.nama AS outlet_name, u.nama AS creator_name
       FROM stock_mutations m
       JOIN products p ON m.product_id = p.id
       JOIN outlets o ON m.outlet_id = o.id
       LEFT JOIN users u ON m.created_by = u.id
       WHERE 1=1
     `;
     const params = [];
     let paramIndex = 1;

     if (outlet_id) { query += ` AND m.outlet_id = $${paramIndex++}`; params.push(outlet_id); }
     if (tanggal) { query += ` AND m.tanggal = $${paramIndex++}`; params.push(tanggal); }
     if (shift) { query += ` AND m.shift = $${paramIndex++}`; params.push(shift); }
     if (product_id) { query += ` AND m.product_id = $${paramIndex++}`; params.push(product_id); }

     const countQuery = `SELECT COUNT(*) FROM (${query}) as t`;
     const totalRes = await pool.query(countQuery, params);
     const total = parseInt(totalRes.rows[0].count);

     query += ` ORDER BY m.tanggal DESC, m.id DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
     params.push(limit, offset);

     const result = await pool.query(query, params);
     return { data: result.rows, meta: { page: parseInt(page), limit: parseInt(limit), total } };
  }
  
  static async getDailySummary(outlet_id, tanggal) {
    // Return SAW/M/SAK/K tiap shift, total_keluar, stok_gudang, nilai persediaan
    const products = await pool.query('SELECT id, nama, urutan FROM products WHERE is_active = true ORDER BY urutan ASC');
    const muts = await pool.query('SELECT * FROM stock_mutations WHERE outlet_id = $1 AND tanggal = $2', [outlet_id, tanggal]);
    
    const summary = [];
    for (let p of products.rows) {
      const pm = muts.rows.filter(m => m.product_id === p.id);
      const mid = pm.find(m => m.shift === 'MIDNIGHT');
      const pagi = pm.find(m => m.shift === 'PAGI');
      const sore = pm.find(m => m.shift === 'SORE');
      
      const total_keluar = (pagi ? pagi.keluar : 0) + (sore ? sore.keluar : 0) + (mid ? mid.keluar : 0);
      let sak_akhir = mid ? mid.sak : (sore ? sore.sak : (pagi ? pagi.sak : 0));
      let harga = mid ? mid.harga_snapshot : (sore ? sore.harga_snapshot : (pagi ? pagi.harga_snapshot : 0));
      const nilai_persediaan = parseFloat(sak_akhir) * parseFloat(harga);
      
      summary.push({
        product_id: p.id,
        nama: p.nama,
        urutan: p.urutan,
        PAGI: pagi ? { saw: pagi.saw, m: pagi.masuk, sak: pagi.sak, k: pagi.keluar } : null,
        SORE: sore ? { saw: sore.saw, m: sore.masuk, sak: sore.sak, k: sore.keluar } : null,
        MIDNIGHT: mid ? { saw: mid.saw, m: mid.masuk, sak: mid.sak, k: mid.keluar } : null,
        total_keluar,
        stok_gudang: sak_akhir,
        nilai_persediaan
      });
    }
    return summary;
  }
}

module.exports = MutationService;

