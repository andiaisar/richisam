const { z } = require('zod');
const RequestService = require('../services/requestService');

const requestSchema = z.object({
  product_id: z.number(),
  qty_requested: z.number().min(1, 'Jumlah harus lebih dari 0')
});

const updateSchema = z.object({
  status: z.enum(['DIPROSES', 'DIKIRIM', 'SELESAI']),
  qty_approved: z.coerce.number().min(0).optional()
});

exports.getRequests = async (req, res) => {
  try {
    const { page, limit, status } = req.query;
    const isBranchStaff = req.user && req.user.role === 'STAF_CABANG' && req.user.outlet_id !== 1;
    
    // Staf gerai cabang hanya melihat tiket miliknya sendiri.
    // Staf CK (outlet_id 1), Admin Pusat, dan Owner dapat memantau seluruh tiket masuk dari cabang.
    const outlet_id = isBranchStaff ? req.user.outlet_id : (req.query.outlet_id || null);
    
    const result = await RequestService.getRequests(page, limit, outlet_id, status);
    res.json({ success: true, message: 'Daftar tiket permintaan', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createRequest = async (req, res) => {
  try {
    const isCK = req.user && (req.user.role === 'ADMIN_GUDANG' || (req.user.role === 'STAF_CABANG' && req.user.outlet_id === 1));
    if (isCK) {
      return res.status(403).json({ success: false, message: 'Staf Central Kitchen bertindak sebagai penyedia/pengirim bahan, bukan pemohon tiket.' });
    }
    const outlet_id = req.user?.outlet_id || req.body.outlet_id;
    if (!outlet_id) return res.status(400).json({ success: false, message: 'outlet_id diperlukan' });

    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });

    const tiket = await RequestService.createRequest(outlet_id, parsed.data.product_id, parsed.data.qty_requested, req.user.id);
    res.status(201).json({ success: true, message: 'Tiket berhasil dibuat', data: tiket });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

const emergencySchema = z.object({
  outlet_id: z.coerce.number(),
  items: z.array(z.object({
    product_id: z.coerce.number(),
    qty: z.coerce.number().min(1)
  })).min(1, 'Pilih minimal 1 produk'),
  password: z.string().min(1, 'Password/PIN wajib diisi')
});

exports.emergencyRequest = async (req, res) => {
  try {
    const parsed = emergencySchema.safeParse(req.body);
    if (!parsed.success) {
      console.error('Zod Error Payload:', req.body);
      console.error('Zod Error:', parsed.error.format());
      return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });
    }

    // Validate password using bcrypt
    const bcrypt = require('bcrypt');
    const pool = require('../config/db'); // we need pool to get password hash
    const user = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (user.rows.length === 0) throw new Error('User tidak ditemukan');
    
    const valid = await bcrypt.compare(parsed.data.password, user.rows[0].password_hash);
    if (!valid) throw new Error('PIN/Password salah! Pengambilan dibatalkan.');

    const result = await RequestService.createEmergencyRequest(parsed.data.outlet_id, parsed.data.items, req.user);
    res.status(201).json({ success: true, message: 'Pengambilan Darurat Berhasil', data: result });
  } catch (e) {
    console.error('Emergency Request Error:', e);
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error('[updateStatus validation error]', req.body, parsed.error.format());
      return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });
    }

    const { status, qty_approved } = parsed.data;

    // Delegasikan validasi RBAC lengkap ke RequestService (isCK, isPusatOrOwner, isBranchStaff)
    const tiket = await RequestService.updateStatus(id, status, qty_approved, req.user);
    res.json({ success: true, message: `Status diubah ke ${status}`, data: tiket });
  } catch (e) {
    console.error(`[updateStatus ERROR] ID: ${req.params.id}, User: ${req.user?.username} (${req.user?.role}, outlet: ${req.user?.outlet_id}), Body:`, req.body, 'Error:', e.message);
    res.status(400).json({ success: false, message: e.message });
  }
};
