const { z } = require('zod');
const RequestService = require('../services/requestService');
const AuditService = require('../services/auditService');

const requestSchema = z.object({
  outlet_id: z.coerce.number().optional(),
  product_id: z.coerce.number().optional(),
  qty_requested: z.coerce.number().min(1, 'Jumlah harus lebih dari 0').optional(),
  items: z.array(z.object({
    product_id: z.coerce.number(),
    qty_requested: z.coerce.number().min(1, 'Jumlah harus minimal 1')
  })).min(1, 'Pilih minimal 1 bahan').optional()
}).refine(data => {
  return (data.items && data.items.length > 0) || (data.product_id && data.qty_requested);
}, {
  message: 'Harap masukkan produk dan jumlah yang diminta',
  path: ['items']
});

const updateSchema = z.object({
  status: z.enum(['DIPROSES', 'DIKIRIM', 'SELESAI']),
  qty_approved: z.coerce.number().min(0).optional(),
  items: z.array(z.object({
    id: z.coerce.number().optional(),
    product_id: z.coerce.number().optional(),
    qty_dikirim: z.coerce.number().min(0, 'Jumlah dikirim tidak boleh negatif').optional(),
    qty_diterima: z.coerce.number().min(0, 'Jumlah diterima tidak boleh negatif').optional(),
    catatan: z.string().optional()
  })).optional(),
  catatan: z.string().optional()
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
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message || 'Validasi gagal';
      return res.status(400).json({ success: false, message: msg, data: parsed.error.format() });
    }

    const isBranchStaff = req.user && req.user.role === 'STAF_CABANG' && Number(req.user.outlet_id) !== 1;
    let outlet_id = isBranchStaff
      ? Number(req.user.outlet_id)
      : Number(parsed.data.outlet_id || req.body.outlet_id || 0);

    // Jika Admin Pusat / Owner / CK mengajukan tiket tanpa memilih cabang, arahkan ke cabang aktif pertama (bukan CK)
    if (!outlet_id || outlet_id === 1) {
      const pool = require('../config/db');
      const firstBranch = await pool.query('SELECT id FROM outlets WHERE id <> 1 AND is_active = true ORDER BY id ASC LIMIT 1');
      outlet_id = firstBranch.rows[0]?.id || 2;
    }

    const items = parsed.data.items && parsed.data.items.length > 0
      ? parsed.data.items
      : [{ product_id: parsed.data.product_id, qty_requested: parsed.data.qty_requested }];

    const tiket = await RequestService.createRequest(outlet_id, items, req.user.id);
    AuditService.logAction({
      userId: req.user?.id,
      userName: req.user?.nama || req.user?.username,
      role: req.user?.role,
      outletId: outlet_id,
      module: 'PERMINTAAN',
      action: 'CREATE',
      description: `Mengajukan Tiket Permintaan Stok ${tiket?.kode_tiket || ''} (${items.length} jenis bahan).`,
      details: { kode_tiket: tiket?.kode_tiket, items_count: items.length }
    });
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
    const isCK = req.user && (req.user.role === 'ADMIN_GUDANG' || (req.user.role === 'STAF_CABANG' && Number(req.user.outlet_id) === 1));
    const isPusatOrOwner = req.user && (req.user.role === 'ADMIN_PUSAT' || req.user.role === 'OWNER');
    if (!isCK && !isPusatOrOwner) {
      return res.status(403).json({ success: false, message: 'Akses ditolak: Hanya Admin Pusat, Owner, atau Staf Central Kitchen yang dapat mencatat pengambilan darurat (Cito).' });
    }

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
    AuditService.logAction({
      userId: req.user?.id,
      userName: req.user?.nama || req.user?.username,
      role: req.user?.role,
      outletId: parsed.data.outlet_id,
      module: 'PERMINTAAN',
      action: 'CITO',
      description: `Otorisasi Pengambilan Darurat (CITO) ${result?.kode_tiket || ''} (${parsed.data.items.length} jenis bahan).`,
      details: { kode_tiket: result?.kode_tiket, tipe_permintaan: 'DARURAT (CITO)', jumlah_jenis_barang: parsed.data.items.length }
    });
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
      const msg = parsed.error.issues?.[0]?.message || 'Validasi gagal';
      return res.status(400).json({ success: false, message: msg, data: parsed.error.format() });
    }

    const { status, qty_approved, items, catatan } = parsed.data;

    // Delegasikan validasi RBAC lengkap ke RequestService (isCK, isPusatOrOwner, isBranchStaff)
    const tiket = await RequestService.updateStatus(id, status, qty_approved, req.user, items, catatan);
    AuditService.logAction({
      userId: req.user?.id,
      userName: req.user?.nama || req.user?.username,
      role: req.user?.role,
      outletId: tiket?.outlet_id || req.user?.outlet_id,
      module: 'PERMINTAAN',
      action: status === 'DIKIRIM' || status === 'SELESAI' ? 'APPROVE' : 'UPDATE',
      description: `Memperbarui status Tiket Permintaan ${tiket?.kode_tiket || `#${id}`} menjadi ${status}.`,
      details: { ticket_id: id, kode_tiket: tiket?.kode_tiket, status_baru: status, qty_disetujui: qty_approved }
    });
    res.json({ success: true, message: `Status diubah ke ${status}`, data: tiket });
  } catch (e) {
    console.error(`[updateStatus ERROR] ID: ${req.params.id}, User: ${req.user?.username} (${req.user?.role}, outlet: ${req.user?.outlet_id}), Body:`, req.body, 'Error:', e.message);
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.createBackorder = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const isCK = req.user && req.user.role === 'ADMIN_GUDANG';
    const isPusatOrOwner = req.user && (req.user.role === 'ADMIN_PUSAT' || req.user.role === 'OWNER');
    if (!isCK && !isPusatOrOwner) {
      return res.status(403).json({ success: false, message: 'Hanya Admin Gudang (CK) atau Admin Pusat yang dapat membuat tiket pengiriman susulan' });
    }

    const newTicket = await RequestService.createBackorderTicket(id, req.user);
    AuditService.logAction({
      userId: req.user?.id,
      userName: req.user?.nama || req.user?.username,
      role: req.user?.role,
      outletId: newTicket?.outlet_id,
      module: 'PERMINTAAN',
      action: 'CREATE',
      description: `Membuat Tiket Pengiriman Susulan ${newTicket?.kode_tiket || ''} dari tiket #${id}.`,
      details: { kode_tiket: newTicket?.kode_tiket, parent_ticket_id: id }
    });
    res.status(201).json({ success: true, message: 'Tiket pengiriman susulan berhasil dibuat', data: newTicket });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
