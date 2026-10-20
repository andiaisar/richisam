const { z } = require('zod');
const MutationService = require('../services/mutationService');
const pool = require('../config/db'); // Needed for opening balance if we put it here

const mutationItemSchema = z.object({
  product_id: z.number(),
  masuk: z.number().min(0),
  sak: z.number().min(0)
});

const createMutationSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  shift: z.enum(['MIDNIGHT', 'PAGI', 'SORE']),
  items: z.array(mutationItemSchema).min(1, 'Minimal satu produk')
});

exports.getMutationForm = async (req, res) => {
  try {
    const outlet_id = req.query.outlet_id || req.body.outlet_id;
    const { tanggal, shift } = req.query;

    if (!outlet_id || !tanggal || !shift) {
      return res.status(400).json({ success: false, message: 'outlet_id, tanggal, dan shift diperlukan' });
    }

    const form = await MutationService.getMutationForm(parseInt(outlet_id), tanggal, shift);
    res.json({ success: true, message: 'Form mutasi harian', data: form });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.createMutations = async (req, res) => {
  try {
    const outlet_id = req.body.outlet_id; // Dari enforceOutletScope jika STAF_CABANG
    if (!outlet_id) return res.status(400).json({ success: false, message: 'outlet_id diperlukan' });

    const parsed = createMutationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });

    const { tanggal, shift, items } = parsed.data;

    await MutationService.createMutations(parseInt(outlet_id), tanggal, shift, items, req.user.id);
    
    res.status(201).json({ success: true, message: 'Mutasi berhasil dicatat' });
  } catch (e) {
    if (e.status === 422) {
      return res.status(422).json({ success: false, message: 'Sebagian atau seluruh item bermasalah', errors: e.errors });
    }
    res.status(422).json({ success: false, message: e.message });
  }
};

exports.updateMutation = async (req, res) => {
  try {
    const { id } = req.params;
    const { masuk, sak } = req.body;
    if (masuk === undefined || sak === undefined) {
      return res.status(400).json({ success: false, message: 'masuk dan sak diperlukan' });
    }
    await MutationService.updateMutation(parseInt(id), masuk, sak, req.user?.id);
    res.json({ success: true, message: 'Mutasi berhasil diupdate' });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.getMutations = async (req, res) => {
  try {
    const { page, limit, outlet_id, tanggal, shift, product_id } = req.query;
    const filterOutlet = req.query.outlet_id || outlet_id;

    const result = await MutationService.getMutations(page, limit, filterOutlet, tanggal, shift, product_id);
    res.json({ success: true, message: 'Riwayat mutasi', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getDailySummary = async (req, res) => {
  try {
    const { outlet_id, tanggal } = req.query;
    if (!outlet_id || !tanggal) {
      return res.status(400).json({ success: false, message: 'outlet_id dan tanggal diperlukan' });
    }
    const summary = await MutationService.getDailySummary(parseInt(outlet_id), tanggal);
    res.json({ success: true, message: 'Daily Summary', data: summary });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getOpeningBalances = async (req, res) => {
  try {
    const { outlet_id } = req.query;
    if (!outlet_id) {
      return res.status(400).json({ success: false, message: 'outlet_id diperlukan' });
    }
    const result = await pool.query(
      `SELECT ob.product_id, ob.qty, ob.tanggal 
       FROM opening_balances ob 
       WHERE ob.outlet_id = $1`,
      [parseInt(outlet_id)]
    );
    res.json({ success: true, data: result.rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createOpeningBalances = async (req, res) => {
  // Body: { outlet_id, items: [{ product_id, qty }] }
  const client = await pool.connect();
  try {
    const { outlet_id, items } = req.body;
    if (!outlet_id || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'outlet_id dan items diperlukan' });
    }
    
    await client.query('BEGIN');
    for (let item of items) {
      const qtyNum = parseInt(item.qty) || 0;
      
      // Simpan atau perbarui nilai stok awal (UPSERT)
      await client.query(
        `INSERT INTO opening_balances (outlet_id, product_id, qty, tanggal, created_by) 
         VALUES ($1, $2, $3, CURRENT_DATE, $4)
         ON CONFLICT (product_id, outlet_id) 
         DO UPDATE SET qty = EXCLUDED.qty, tanggal = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP`,
        [outlet_id, item.product_id, qtyNum, req.user.id]
      );
      
      // Cek apakah produk ini sudah memiliki riwayat mutasi shift
      const mutExist = await client.query(
        'SELECT id FROM stock_mutations WHERE outlet_id = $1 AND product_id = $2 LIMIT 1',
        [outlet_id, item.product_id]
      );
      // Jika belum ada mutasi shift harian, sinkronkan juga tabel stocks (qty_current)
      if (mutExist.rows.length === 0) {
        await client.query(
          `INSERT INTO stocks (outlet_id, product_id, qty_current, updated_at) 
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (product_id, outlet_id) 
           DO UPDATE SET qty_current = EXCLUDED.qty_current, updated_at = CURRENT_TIMESTAMP`,
          [outlet_id, item.product_id, qtyNum]
        );
      }
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Opening balances berhasil disimpan' });
  } catch(e) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: e.message });
  } finally {
    client.release();
  }
};
