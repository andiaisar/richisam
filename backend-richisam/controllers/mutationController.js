const { z } = require('zod');
const MutationService = require('../services/mutationService');

const mutationItemSchema = z.object({
  product_id: z.number(),
  masuk: z.number().min(0),
  keluar: z.number().min(0)
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

    // Staf hanya bisa merekam mutasi secara keseluruhan dalam array
    await MutationService.createMutations(parseInt(outlet_id), tanggal, shift, items, req.user.id);
    
    res.status(201).json({ success: true, message: 'Mutasi berhasil dicatat' });
  } catch (e) {
    res.status(422).json({ success: false, message: e.message });
  }
};

exports.getMutations = async (req, res) => {
  try {
    const { page, limit, outlet_id, tanggal, shift, product_id } = req.query;
    // enforceOutletScope pada STAF_CABANG sudah menyisipkan outlet_id ke req.query
    const filterOutlet = req.query.outlet_id || outlet_id;

    const result = await MutationService.getMutations(page, limit, filterOutlet, tanggal, shift, product_id);
    res.json({ success: true, message: 'Riwayat mutasi', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
