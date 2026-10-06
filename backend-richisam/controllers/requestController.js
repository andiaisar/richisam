const { z } = require('zod');
const RequestService = require('../services/requestService');

const requestSchema = z.object({
  product_id: z.number(),
  qty_requested: z.number().min(1, 'Jumlah harus lebih dari 0')
});

const updateSchema = z.object({
  status: z.enum(['PROSES', 'DIKIRIM', 'SELESAI']),
  qty_approved: z.number().min(0).optional()
});

exports.getRequests = async (req, res) => {
  try {
    const { page, limit, status } = req.query;
    const outlet_id = req.query.outlet_id || (req.body && req.body.outlet_id); // from enforceOutletScope
    
    const result = await RequestService.getRequests(page, limit, outlet_id, status);
    res.json({ success: true, message: 'Daftar tiket permintaan', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createRequest = async (req, res) => {
  try {
    const outlet_id = req.body.outlet_id;
    if (!outlet_id) return res.status(400).json({ success: false, message: 'outlet_id diperlukan' });

    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });

    const tiket = await RequestService.createRequest(outlet_id, parsed.data.product_id, parsed.data.qty_requested, req.user.id);
    res.status(201).json({ success: true, message: 'Tiket berhasil dibuat', data: tiket });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });

    const { status, qty_approved } = parsed.data;

    // RBAC logic here or in service
    if (status === 'PROSES' || status === 'DIKIRIM') {
      if (req.user.role === 'STAF_CABANG') return res.status(403).json({ success: false, message: 'Staf tidak bisa mengubah status ke PROSES/DIKIRIM' });
    }

    const tiket = await RequestService.updateStatus(id, status, qty_approved, req.user);
    res.json({ success: true, message: `Status diubah ke ${status}`, data: tiket });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
