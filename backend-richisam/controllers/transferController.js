const { z } = require('zod');
const TransferService = require('../services/transferService');
const AuditService = require('../services/auditService');

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

const rejectSchema = z.object({
  rejection_reason: z.string().optional().default('Ditolak oleh Admin')
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

    // Ensure the branch staff only transfers involving their own outlet (as sender or receiver)
    if (req.user.role === 'STAF_CABANG') {
      const userOutlet = Number(req.user.outlet_id);
      const fromOutlet = Number(parsed.data.from_outlet_id);
      const toOutlet = Number(parsed.data.to_outlet_id);
      if (userOutlet !== fromOutlet && userOutlet !== toOutlet) {
        throw new Error('Anda hanya dapat mengajukan permohonan transfer yang melibatkan cabang Anda');
      }
    }

    // Alur Otorisasi:
    // Jika diajukan oleh Staf Cabang, status WAJIB 'PENDING' menunggu persetujuan Admin Pusat/Owner/Gudang.
    // Jika diajukan oleh Admin Pusat / Owner langsung, status langsung 'APPROVED'.
    const isDirectAdmin = req.user.role === 'ADMIN_PUSAT' || req.user.role === 'OWNER';
    const initialStatus = isDirectAdmin ? 'APPROVED' : 'PENDING';

    const result = await TransferService.createTransfer(
      parsed.data.from_outlet_id, 
      parsed.data.to_outlet_id, 
      parsed.data.items, 
      req.user.id,
      parsed.data.catatan,
      initialStatus
    );

    // Rekam ke AUDIT TRAIL
    AuditService.logAction({
      userId: req.user.id,
      outletId: parsed.data.from_outlet_id,
      module: 'TRANSFER',
      action: isDirectAdmin ? 'CREATE' : 'REQUEST',
      description: isDirectAdmin 
        ? `Mentransfer langsung ${parsed.data.items.length} item ke Cabang #${parsed.data.to_outlet_id}. Catatan: ${parsed.data.catatan || '-'}`
        : `Mengajukan permohonan transfer stok ${parsed.data.items.length} item ke Cabang #${parsed.data.to_outlet_id} (Menunggu Otorisasi Admin).`,
      details: { from_outlet_id: parsed.data.from_outlet_id, to_outlet_id: parsed.data.to_outlet_id, items_count: parsed.data.items.length, status: initialStatus }
    });

    res.status(201).json({ 
      success: true, 
      message: isDirectAdmin 
        ? 'Transfer Antar Cabang Berhasil Dieksekusi Langsung!' 
        : 'Pengajuan Transfer Berhasil Dibuat! Menunggu Otorisasi / Persetujuan Admin Pusat.',
      data: result 
    });
  } catch (e) {
    console.error('Transfer Error:', e);
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.approveTransfer = async (req, res) => {
  try {
    const { kode_transfer } = req.params;
    const isAuthorized = req.user && (req.user.role === 'ADMIN_PUSAT' || req.user.role === 'OWNER' || req.user.role === 'ADMIN_GUDANG');
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Akses ditolak: Hanya Admin Pusat, Owner, atau Admin Gudang yang dapat menyetujui transfer' });
    }

    const result = await TransferService.approveTransfer(kode_transfer, req.user);
    AuditService.logAction({
      userId: req.user.id,
      module: 'TRANSFER',
      action: 'APPROVE',
      description: `Menyetujui transfer antar-cabang [${kode_transfer}]. Stok cabang telah termutasi dan surat jalan resmi diterbitkan.`,
      details: { kode_transfer }
    });
    res.json({ success: true, message: 'Transfer berhasil disetujui & stok cabang telah termutasi!', data: result });
  } catch (e) {
    console.error('Approve Transfer Error:', e);
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.rejectTransfer = async (req, res) => {
  try {
    const { kode_transfer } = req.params;
    const isAuthorized = req.user && (req.user.role === 'ADMIN_PUSAT' || req.user.role === 'OWNER' || req.user.role === 'ADMIN_GUDANG');
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Akses ditolak: Hanya Admin yang dapat menolak transfer' });
    }

    const parsed = rejectSchema.safeParse(req.body);
    const reason = parsed.success && parsed.data.rejection_reason ? parsed.data.rejection_reason : 'Ditolak oleh Admin';

    const result = await TransferService.rejectTransfer(kode_transfer, req.user, reason);
    AuditService.logAction({
      userId: req.user.id,
      module: 'TRANSFER',
      action: 'REJECT',
      description: `Menolak permohonan transfer antar-cabang [${kode_transfer}]. Alasan: ${reason}`,
      details: { kode_transfer, reason }
    });
    res.json({ success: true, message: 'Permohonan transfer telah ditolak.', data: result });
  } catch (e) {
    console.error('Reject Transfer Error:', e);
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
