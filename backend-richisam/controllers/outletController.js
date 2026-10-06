const { z } = require('zod');
const OutletService = require('../services/outletService');

const outletSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  tipe: z.enum(['PUSAT', 'CABANG']),
  alamat: z.string().optional(),
  is_active: z.boolean().optional()
});

exports.getOutlets = async (req, res) => {
  try {
    const { page, limit, search, tipe } = req.query;
    const result = await OutletService.getOutlets(page, limit, search, tipe);
    res.json({ success: true, message: 'Daftar outlet', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createOutlet = async (req, res) => {
  try {
    const parsed = outletSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });

    const outlet = await OutletService.createOutlet(parsed.data);
    res.status(201).json({ success: true, message: 'Outlet berhasil dibuat', data: outlet });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.updateOutlet = async (req, res) => {
  try {
    const parsed = outletSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });

    const outlet = await OutletService.updateOutlet(parseInt(req.params.id), parsed.data);
    res.json({ success: true, message: 'Outlet berhasil diperbarui', data: outlet });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
