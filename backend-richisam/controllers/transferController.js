const { z } = require('zod');
const TransferService = require('../services/transferService');

const transferSchema = z.object({
  from_outlet_id: z.coerce.number(),
  to_outlet_id: z.coerce.number(),
  catatan: z.string().optional().default(''),
  items: z.array(z.object({
    product_id: z.coerce.number(),
    qty: z.coerce.number().min(1)
  })).min(1, 'Pilih minimal 1 produk'),
  password: z.string().min(1, 'Password wajib diisi')
});

exports.createTransfer = async (req, res) => {
  try {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error('Zod Validation Error:', parsed.error.format());
      return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });
    }

    // Verify user password for security
    const bcrypt = require('bcrypt');
    const pool = require('../config/db');
    const user = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (user.rows.length === 0) throw new Error('User tidak ditemukan');
    
    const valid = await bcrypt.compare(parsed.data.password, user.rows[0].password_hash);
    if (!valid) throw new Error('Password salah! Transfer dibatalkan.');

    // Ensure the sender is authorized for from_outlet_id (if not ADMIN_PUSAT/OWNER)
    if (req.user.role === 'STAF_CABANG' && req.user.outlet_id !== parsed.data.from_outlet_id) {
      throw new Error('Anda tidak memiliki akses untuk mentransfer dari cabang ini');
    }

    const result = await TransferService.createTransfer(
      parsed.data.from_outlet_id, 
      parsed.data.to_outlet_id, 
      parsed.data.items, 
      req.user.id,
      parsed.data.catatan
    );

    res.status(201).json({ 
      success: true, 
      message: 'Transfer Antar Cabang Berhasil!',
      data: result 
    });
  } catch (e) {
    console.error('Transfer Error:', e);
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.getTransfers = async (req, res) => {
  try {
    const outlet_id = req.user.role === 'STAF_CABANG' ? req.user.outlet_id : (req.query.outlet_id || null);
    const data = await TransferService.getTransfers(outlet_id);
    res.json({ success: true, data });
  } catch (e) {
    console.error('Get Transfers Error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};
