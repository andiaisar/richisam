const pool = require('../config/db');
const NotificationService = require('./notificationService');

class RequestService {
  static async getRequests(page = 1, limit = 10, outlet_id, status) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT t.*, o.nama AS outlet_name, u.nama AS creator_name,
             (
               SELECT json_agg(
                 json_build_object(
                   'id', rti.id,
                   'product_id', rti.product_id,
                   'product_kode', p.kode,
                   'product_name', p.nama,
                   'product_satuan', p.satuan,
                   'qty_diminta', rti.qty_diminta,
                   'qty_disetujui', rti.qty_disetujui,
                   'qty_dikirim', rti.qty_dikirim,
                   'qty_diterima', rti.qty_diterima,
                   'catatan', rti.catatan,
                   'stok_pusat', COALESCE(sp.qty_current, 0)
                 ) ORDER BY rti.id ASC
               )
               FROM restock_ticket_items rti
               JOIN products p ON rti.product_id = p.id
               LEFT JOIN stocks sp ON sp.product_id = p.id AND sp.outlet_id = 1
               WHERE rti.ticket_id = t.id
             ) AS items,
             (SELECT COUNT(*) FROM restock_ticket_items WHERE ticket_id = t.id) AS total_items,
             (SELECT p.nama FROM restock_ticket_items rti JOIN products p ON rti.product_id = p.id WHERE rti.ticket_id = t.id ORDER BY rti.id ASC LIMIT 1) AS product_name,
             (SELECT p.kode FROM restock_ticket_items rti JOIN products p ON rti.product_id = p.id WHERE rti.ticket_id = t.id ORDER BY rti.id ASC LIMIT 1) AS product_kode,
             (SELECT p.satuan FROM restock_ticket_items rti JOIN products p ON rti.product_id = p.id WHERE rti.ticket_id = t.id ORDER BY rti.id ASC LIMIT 1) AS product_satuan,
             (SELECT SUM(qty_diminta) FROM restock_ticket_items WHERE ticket_id = t.id) AS qty_requested,
             (SELECT NULLIF(SUM(qty_dikirim), 0) FROM restock_ticket_items WHERE ticket_id = t.id) AS qty_approved
      FROM restock_tickets t
      JOIN outlets o ON t.outlet_id = o.id
      JOIN users u ON t.requested_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (outlet_id) { query += ` AND t.outlet_id = $${paramIndex++}`; params.push(outlet_id); }
    if (status) { query += ` AND t.status = $${paramIndex++}`; params.push(status); }

    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) AS t`, params);
    const total = parseInt(countRes.rows[0].count);

    query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return { data: result.rows, meta: { total, page: parseInt(page), limit: parseInt(limit) } };
  }

  static async createRequest(outlet_id, product_id_or_items, qty_requested_or_user_id, user_id_param) {
    const kode_tiket = 'REQ-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let items = [];
      let user_id = null;
      if (Array.isArray(product_id_or_items)) {
        items = product_id_or_items;
        user_id = qty_requested_or_user_id;
      } else {
        items = [{ product_id: product_id_or_items, qty_diminta: qty_requested_or_user_id }];
        user_id = user_id_param;
      }

      if (items.length === 0) throw new Error('Minimal harus ada 1 barang yang diminta');

      const ticketResult = await client.query(
        `INSERT INTO restock_tickets (kode_tiket, outlet_id, requested_by) 
         VALUES ($1, $2, $3) RETURNING *`,
        [kode_tiket, outlet_id, user_id]
      );
      const ticket = ticketResult.rows[0];

      for (const item of items) {
        const pId = parseInt(item.product_id, 10);
        const qty = parseInt(item.qty_diminta || item.qty_requested || item.qty, 10) || 1;
        await client.query(
          `INSERT INTO restock_ticket_items (ticket_id, product_id, qty_diminta, qty_dikirim) 
           VALUES ($1, $2, $3, $3)`,
          [ticket.id, pId, qty]
        );
      }

      // Notifikasi untuk Pusat bahwa ada tiket permintaan baru
      const outInfo = await client.query('SELECT nama FROM outlets WHERE id = $1', [outlet_id]);
      const outletName = outInfo.rows[0]?.nama || 'Cabang';
      const firstProd = await client.query('SELECT nama FROM products WHERE id = $1', [items[0].product_id]);
      const prodName = firstProd.rows[0]?.nama || 'Bahan Baku';
      const pesan = items.length > 1
        ? `Tiket Permintaan Baru [${kode_tiket}]: ${outletName} meminta ${items.length} jenis bahan (${prodName}, dll). Menunggu proses Pusat.`
        : `Tiket Permintaan Baru [${kode_tiket}]: ${outletName} meminta ${items[0].qty_diminta || items[0].qty_requested || 1} unit ${prodName}. Menunggu proses Pusat.`;
      
      await NotificationService.notifyPusat({ product_id: items[0].product_id, tipe: 'TIKET', pesan }, client);

      await client.query('COMMIT');
      return ticket;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async updateStatus(id, newStatus, qty_approved, req_user, itemsPayload, rootCatatan) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const tiketRes = await client.query('SELECT * FROM restock_tickets WHERE id = $1 FOR UPDATE', [id]);
      if (tiketRes.rows.length === 0) throw new Error('Tiket tidak ditemukan');
      const tiket = tiketRes.rows[0];

      const isCK = req_user.role === 'ADMIN_GUDANG';
      const isPusatOrOwner = req_user.role === 'ADMIN_PUSAT' || req_user.role === 'OWNER';
      let hasDiscrepancy = false;

      // 1. Memproses atau Mengirim Tiket (DIPROSES atau DIKIRIM)
      // Staf Cabang tidak boleh mengubah status pengiriman; hanya Admin Gudang (CK), Admin Pusat, atau Owner
      if (newStatus === 'DIPROSES' || newStatus === 'DIKIRIM') {
        if (!isCK && !isPusatOrOwner) {
          throw new Error('Staf tidak dapat mengubah status pengiriman. Hanya Admin Pusat atau Admin Gudang (CK) yang berhak memproses dan mengirim barang.');
        }

        // Potong stok Central Kitchen (outlet_id = 1) saat status diubah menjadi DIKIRIM
        if (newStatus === 'DIKIRIM' && tiket.status !== 'DIKIRIM' && tiket.status !== 'SELESAI') {
          const CK_OUTLET_ID = 1;
          const itemsRes = await client.query('SELECT * FROM restock_ticket_items WHERE ticket_id = $1', [id]);
          const items = itemsRes.rows || [];
          const hour = new Date().getHours();
          let shift = 'MIDNIGHT';
          if (hour >= 6 && hour < 14) shift = 'PAGI';
          else if (hour >= 14 && hour < 22) shift = 'SORE';
          const tanggal = new Date().toISOString().split('T')[0];

          for (const item of items) {
            const itmMatch = itemsPayload && itemsPayload.find(p => Number(p.id) === Number(item.id) || Number(p.product_id) === Number(item.product_id));
            const qty = parseInt(itmMatch?.qty_dikirim !== undefined ? itmMatch.qty_dikirim : (qty_approved || item.qty_dikirim || item.qty_diminta), 10) || 0;
            if (qty <= 0) continue;

            const prevMut = await client.query(
              `SELECT sak FROM stock_mutations
               WHERE outlet_id = $1 AND product_id = $2
               ORDER BY tanggal DESC,
                        CASE shift WHEN 'MIDNIGHT' THEN 3 WHEN 'SORE' THEN 2 WHEN 'PAGI' THEN 1 ELSE 0 END DESC,
                        id DESC
               LIMIT 1`,
              [CK_OUTLET_ID, item.product_id]
            );
            let saw = 0;
            if (prevMut.rows.length > 0) {
              saw = prevMut.rows[0].sak;
            } else {
              const stock = await client.query('SELECT qty_current FROM stocks WHERE outlet_id = $1 AND product_id = $2', [CK_OUTLET_ID, item.product_id]);
              saw = stock.rows.length > 0 ? stock.rows[0].qty_current : 0;
            }
            const sak = Math.max(0, saw - qty);

            await client.query(
              `INSERT INTO stock_mutations (product_id, outlet_id, tanggal, shift, saw, masuk, keluar, sak, created_by, sumber_masuk, ticket_id) 
               VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, 'TIKET', $9)
               ON CONFLICT (product_id, outlet_id, tanggal, shift)
               DO UPDATE SET 
                 keluar = stock_mutations.keluar + EXCLUDED.keluar,
                 sak = EXCLUDED.sak,
                 ticket_id = EXCLUDED.ticket_id`,
              [item.product_id, CK_OUTLET_ID, tanggal, shift, saw, qty, sak, req_user.id, tiket.id]
            );
            await client.query('UPDATE stocks SET qty_current = $1 WHERE outlet_id = $2 AND product_id = $3', [sak, CK_OUTLET_ID, item.product_id]);
            await NotificationService.checkParStock(CK_OUTLET_ID, item.product_id);
          }
        }
      }

      // 2. Mengonfirmasi Penerimaan Tiket di Cabang (SELESAI)
      // Hanya boleh dilakukan oleh Staf Cabang Pemohon (yang menerima fisik di outlet), Admin Pusat, atau Owner
      if (newStatus === 'SELESAI') {
        if (req_user.role === 'STAF_CABANG' && !isCK && Number(tiket.outlet_id) !== Number(req_user.outlet_id)) {
          throw new Error('Anda tidak memiliki akses untuk menerima tiket cabang lain');
        }
        if (tiket.status !== 'DIKIRIM') throw new Error('Tiket belum dikirim oleh Central Kitchen');

        const itemsRes = await client.query('SELECT * FROM restock_ticket_items WHERE ticket_id = $1', [id]);
        const items = itemsRes.rows || [];

        const hour = new Date().getHours();
        let shift = 'MIDNIGHT';
        if (hour >= 6 && hour < 14) shift = 'PAGI';
        else if (hour >= 14 && hour < 22) shift = 'SORE';
        const tanggal = new Date().toISOString().split('T')[0];

        for (const item of items) {
          const itmMatch = itemsPayload && itemsPayload.find(p => Number(p.id) === Number(item.id) || Number(p.product_id) === Number(item.product_id));
          const qtyKirim = parseInt(item.qty_dikirim !== null && item.qty_dikirim !== undefined ? item.qty_dikirim : item.qty_diminta, 10) || 0;
          
          // Qty yang benar-benar diterima fisik oleh staf outlet
          let qtyDiterima = qtyKirim;
          if (itmMatch && itmMatch.qty_diterima !== undefined && itmMatch.qty_diterima !== null) {
            qtyDiterima = Math.max(0, parseInt(itmMatch.qty_diterima, 10) || 0);
          } else if (item.qty_diterima !== null && item.qty_diterima !== undefined && item.qty_diterima > 0) {
            qtyDiterima = Math.max(0, parseInt(item.qty_diterima, 10) || 0);
          }

          const itemCatatan = itmMatch?.catatan !== undefined ? itmMatch.catatan : item.catatan;

          if (qtyDiterima < qtyKirim) {
            hasDiscrepancy = true;
          }

          // Update restock_ticket_items jika ada payload checklist atau catatan
          if (itemsPayload && itemsPayload.length > 0) {
            await client.query(
              `UPDATE restock_ticket_items 
               SET qty_diterima = $1, 
                   catatan = COALESCE($2, catatan) 
               WHERE id = $3`,
              [qtyDiterima, itemCatatan || null, item.id]
            );
          }

          if (qtyDiterima <= 0) continue;
          
          const prevMut = await client.query(
           `SELECT sak FROM stock_mutations
            WHERE outlet_id = $1 AND product_id = $2
            ORDER BY tanggal DESC,
                     CASE shift WHEN 'MIDNIGHT' THEN 3 WHEN 'SORE' THEN 2 WHEN 'PAGI' THEN 1 ELSE 0 END DESC,
                     id DESC
            LIMIT 1`,
           [tiket.outlet_id, item.product_id]
          );
          
          let saw = 0;
          if (prevMut.rows.length > 0) {
            saw = prevMut.rows[0].sak;
          } else {
            const stock = await client.query('SELECT qty_current FROM stocks WHERE outlet_id = $1 AND product_id = $2', [tiket.outlet_id, item.product_id]);
            saw = stock.rows.length > 0 ? stock.rows[0].qty_current : 0;
          }

          const sak = saw + qtyDiterima;

          await client.query(
            `INSERT INTO stock_mutations (product_id, outlet_id, tanggal, shift, saw, masuk, keluar, sak, created_by, sumber_masuk, ticket_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'TIKET', $10)
             ON CONFLICT (product_id, outlet_id, tanggal, shift)
             DO UPDATE SET 
               masuk = stock_mutations.masuk + EXCLUDED.masuk,
               sak = EXCLUDED.sak,
               ticket_id = EXCLUDED.ticket_id`,
            [item.product_id, tiket.outlet_id, tanggal, shift, saw, qtyDiterima, 0, sak, req_user.id, tiket.id]
          );

          await client.query('UPDATE stocks SET qty_current = $1 WHERE outlet_id = $2 AND product_id = $3', [sak, tiket.outlet_id, item.product_id]);
          await NotificationService.checkParStock(tiket.outlet_id, item.product_id);
        }
      }

      // Update per item dari itemsPayload atau qty_approved saat status DIPROSES / DIKIRIM
      if (newStatus !== 'SELESAI') {
        if (itemsPayload && Array.isArray(itemsPayload) && itemsPayload.length > 0) {
          for (const itm of itemsPayload) {
            const itmQty = parseInt(itm.qty_dikirim, 10);
            if (!isNaN(itmQty)) {
              await client.query(
                `UPDATE restock_ticket_items 
                 SET qty_dikirim = $1, 
                     qty_disetujui = $1, 
                     catatan = COALESCE($2, catatan) 
                 WHERE (id = $3 OR product_id = $4) AND ticket_id = $5`,
                [itmQty, itm.catatan || null, itm.id || 0, itm.product_id || 0, id]
              );
            }
          }
        } else if (qty_approved !== undefined) {
          const itemsRes = await client.query('SELECT id FROM restock_ticket_items WHERE ticket_id = $1 LIMIT 1', [id]);
          if (itemsRes.rows.length > 0) {
            await client.query('UPDATE restock_ticket_items SET qty_dikirim = $1, qty_disetujui = $1 WHERE id = $2', [qty_approved, itemsRes.rows[0].id]);
          }
        }
      }

      const resUpdate = await client.query(
        `UPDATE restock_tickets 
         SET status = $1::ticket_status_enum, 
             ada_selisih = CASE WHEN $1::text = 'SELESAI' THEN $5 ELSE ada_selisih END,
             catatan = CASE 
               WHEN $4::text IS NOT NULL AND $4::text != '' THEN 
                 CASE WHEN catatan IS NOT NULL AND catatan != '' THEN catatan || ' | ' || $4::text ELSE $4::text END
               ELSE catatan 
             END,
             processed_by = CASE WHEN $1::text IN ('DIPROSES', 'DIKIRIM') AND processed_by IS NULL THEN $3 ELSE processed_by END,
             processed_at = CASE WHEN $1::text IN ('DIPROSES', 'DIKIRIM') AND processed_at IS NULL THEN CURRENT_TIMESTAMP ELSE processed_at END,
             received_by = CASE WHEN $1::text = 'SELESAI' THEN $3 ELSE received_by END,
             received_at = CASE WHEN $1::text = 'SELESAI' AND received_at IS NULL THEN CURRENT_TIMESTAMP ELSE received_at END,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 RETURNING *`,
        [newStatus, id, req_user.id, rootCatatan || null, hasDiscrepancy]
      );
      const updatedTicket = resUpdate.rows[0];

      // Notifikasi status tiket & pengiriman surat jalan
      const outInfo = await client.query('SELECT nama FROM outlets WHERE id = $1', [tiket.outlet_id]);
      const outletName = outInfo.rows[0]?.nama || 'Cabang';

      if (newStatus === 'DIKIRIM') {
        const pesan = `Surat Jalan Dikirim: Tiket [${tiket.kode_tiket}] sedang dalam pengiriman ke ${outletName}. Mohon staf verifikasi fisik & terima stok saat tiba.`;
        await NotificationService.notifyOutlet({ outlet_id: tiket.outlet_id, product_id: null, tipe: 'TIKET', pesan }, client);
      } else if (newStatus === 'SELESAI') {
        const isDiscrepancy = updatedTicket?.ada_selisih;
        const pesan = isDiscrepancy
          ? `Penerimaan dengan Selisih: Tiket [${tiket.kode_tiket}] diterima oleh ${outletName} dengan catatan fisik tidak lengkap/rusak. Stok cabang telah disesuaikan dengan fisik diterima.`
          : `Penerimaan Selesai: Tiket [${tiket.kode_tiket}] telah diterima & diverifikasi lengkap oleh ${outletName}. Stok cabang telah bertambah.`;
        await NotificationService.notifyPusat({ product_id: null, tipe: 'TIKET', pesan }, client);
      }

      await client.query('COMMIT');
      return resUpdate.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async createEmergencyRequest(outlet_id, items, req_user) {
    const kode_tiket = 'CITO-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const ticketResult = await client.query(
        `INSERT INTO restock_tickets (kode_tiket, outlet_id, requested_by, processed_by, received_by, status, catatan) 
         VALUES ($1, $2, $3, $4, $4, 'SELESAI', 'PENGAMBILAN DARURAT (CITO)') RETURNING *`,
        [kode_tiket, outlet_id, req_user.id, req_user.id]
      );
      const ticket = ticketResult.rows[0];

      const hour = new Date().getHours();
      let shift = 'PAGI';
      if (hour >= 6 && hour < 14) shift = 'PAGI';
      else if (hour >= 14 && hour < 22) shift = 'SORE';
      const tanggal = new Date().toISOString().split('T')[0];

      for (const item of items) {
        await client.query(
          `INSERT INTO restock_ticket_items (ticket_id, product_id, qty_diminta, qty_dikirim) 
           VALUES ($1, $2, $3, $4)`,
          [ticket.id, item.product_id, item.qty, item.qty]
        );

        const qtyToOutlet = parseInt(item.qty, 10) || 0;

        const prevMut = await client.query(
         `SELECT sak FROM stock_mutations
          WHERE outlet_id = $1 AND product_id = $2
          ORDER BY tanggal DESC,
                   CASE shift WHEN 'MIDNIGHT' THEN 3 WHEN 'SORE' THEN 2 WHEN 'PAGI' THEN 1 ELSE 0 END DESC,
                   id DESC
          LIMIT 1`,
         [outlet_id, item.product_id]
        );
        
        let saw = 0;
        if (prevMut.rows.length > 0) {
          saw = prevMut.rows[0].sak;
        } else {
          const stock = await client.query('SELECT qty_current FROM stocks WHERE outlet_id = $1 AND product_id = $2', [outlet_id, item.product_id]);
          saw = stock.rows.length > 0 ? stock.rows[0].qty_current : 0;
        }

        const sak = saw + qtyToOutlet;

        await client.query(
          `INSERT INTO stock_mutations (product_id, outlet_id, tanggal, shift, saw, masuk, keluar, sak, created_by, sumber_masuk, ticket_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'TIKET', $10)
           ON CONFLICT (product_id, outlet_id, tanggal, shift)
           DO UPDATE SET 
             masuk = stock_mutations.masuk + EXCLUDED.masuk,
             sak = EXCLUDED.sak,
             ticket_id = EXCLUDED.ticket_id`,
          [item.product_id, outlet_id, tanggal, shift, saw, qtyToOutlet, 0, sak, req_user.id, ticket.id]
        );

        await client.query('UPDATE stocks SET qty_current = $1 WHERE outlet_id = $2 AND product_id = $3', [sak, outlet_id, item.product_id]);
        await NotificationService.checkParStock(outlet_id, item.product_id);

        // Potong stok Central Kitchen (outlet_id = 1) jika pengiriman ditujukan ke cabang lain
        const CK_OUTLET_ID = 1;
        if (Number(outlet_id) !== CK_OUTLET_ID) {
          const prevMutCK = await client.query(
            'SELECT sak FROM stock_mutations WHERE outlet_id = $1 AND product_id = $2 ORDER BY id DESC LIMIT 1',
            [CK_OUTLET_ID, item.product_id]
          );
          let sawCK = 0;
          if (prevMutCK.rows.length > 0) {
            sawCK = prevMutCK.rows[0].sak;
          } else {
            const stockCK = await client.query('SELECT qty_current FROM stocks WHERE outlet_id = $1 AND product_id = $2', [CK_OUTLET_ID, item.product_id]);
            sawCK = stockCK.rows.length > 0 ? stockCK.rows[0].qty_current : 0;
          }
          const sakCK = Math.max(0, sawCK - qtyToOutlet);

          await client.query(
            `INSERT INTO stock_mutations (product_id, outlet_id, tanggal, shift, saw, masuk, keluar, sak, created_by, sumber_masuk, ticket_id) 
             VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, 'TIKET', $9)
             ON CONFLICT (product_id, outlet_id, tanggal, shift)
             DO UPDATE SET 
               keluar = stock_mutations.keluar + EXCLUDED.keluar,
               sak = EXCLUDED.sak,
               ticket_id = EXCLUDED.ticket_id`,
            [item.product_id, CK_OUTLET_ID, tanggal, shift, sawCK, qtyToOutlet, sakCK, req_user.id, ticket.id]
          );

          await client.query('UPDATE stocks SET qty_current = $1 WHERE outlet_id = $2 AND product_id = $3', [sakCK, CK_OUTLET_ID, item.product_id]);
          await NotificationService.checkParStock(CK_OUTLET_ID, item.product_id);
        }
      }

      // Notifikasi CITO darurat ke Pusat
      const outInfo = await client.query('SELECT nama FROM outlets WHERE id = $1', [outlet_id]);
      const outletName = outInfo.rows[0]?.nama || 'Cabang';
      const pesan = `PENGAMBILAN DARURAT (CITO): [${kode_tiket}] telah dibuat & diselesaikan langsung oleh ${outletName}. Stok cabang telah termutasi.`;
      await NotificationService.notifyPusat({ product_id: null, tipe: 'TIKET', pesan }, client);

      await client.query('COMMIT');
      return ticket;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async createBackorderTicket(parentTicketId, req_user) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const parentRes = await client.query('SELECT * FROM restock_tickets WHERE id = $1 FOR UPDATE', [parentTicketId]);
      if (parentRes.rows.length === 0) throw new Error('Tiket utama tidak ditemukan');
      const parent = parentRes.rows[0];

      if (req_user.role === 'STAF_CABANG' && Number(req_user.outlet_id) !== Number(parent.outlet_id)) {
        throw new Error('Anda tidak memiliki akses untuk membuat susulan untuk cabang lain');
      }

      const itemsRes = await client.query(
        `SELECT rti.*, p.nama as product_name 
         FROM restock_ticket_items rti 
         JOIN products p ON rti.product_id = p.id 
         WHERE rti.ticket_id = $1`,
        [parentTicketId]
      );
      const backorderItems = itemsRes.rows.filter(it => {
        const received = it.qty_diterima !== null && it.qty_diterima !== undefined 
          ? it.qty_diterima 
          : (it.qty_dikirim !== null ? it.qty_dikirim : 0);
        return (it.qty_diminta - received) > 0;
      });

      if (backorderItems.length === 0) {
        throw new Error('Tidak ada barang susulan yang tersisa pada tiket ini');
      }

      const kode_tiket = 'REQ-SUSULAN-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 100);
      const newTicketRes = await client.query(
        `INSERT INTO restock_tickets (kode_tiket, outlet_id, requested_by, catatan)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [kode_tiket, parent.outlet_id, req_user.id, `Pengiriman Susulan dari Tiket ${parent.kode_tiket}`]
      );
      const newTicket = newTicketRes.rows[0];

      for (const item of backorderItems) {
        const received = item.qty_diterima !== null && item.qty_diterima !== undefined 
          ? item.qty_diterima 
          : (item.qty_dikirim !== null ? item.qty_dikirim : 0);
        const sisa = item.qty_diminta - received;
        await client.query(
          `INSERT INTO restock_ticket_items (ticket_id, product_id, qty_diminta, qty_dikirim, catatan)
           VALUES ($1, $2, $3, $3, $4)`,
          [newTicket.id, item.product_id, sisa, `Sisa susulan dari ${parent.kode_tiket}`]
        );
      }

      await client.query(
        `UPDATE restock_tickets 
         SET catatan = COALESCE(catatan, '') || ' [Telah dibuat pengiriman susulan: ' || $1 || ']'
         WHERE id = $2`,
        [kode_tiket, parentTicketId]
      );

      const outInfo = await client.query('SELECT nama FROM outlets WHERE id = $1', [parent.outlet_id]);
      const outletName = outInfo.rows[0]?.nama || 'Cabang';
      const pesan = `Tiket Pengiriman Susulan [${kode_tiket}]: Central Kitchen telah menjadwalkan pengiriman kekurangan barang untuk ${outletName}.`;
      await NotificationService.notifyOutlet({ outlet_id: parent.outlet_id, product_id: null, tipe: 'TIKET', pesan }, client);

      await client.query('COMMIT');
      return newTicket;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
module.exports = RequestService;
