const { z } = require('zod');
const ParStockService = require('../services/parStockService');

const upsertSchema = z.object({
  updates: z.array(z.object({
    product_id: z.number(),
    min_qty: z.number().min(0)
  })).min(1)
});

exports.getParStocks = async (req, res) => {
  try {
    const { outlet_id } = req.query;
    // Allow fetching all if outlet_id is not provided (for Admin Pusat)

    const result = await ParStockService.getParStocks(parseInt(outlet_id));
    res.json({ success: true, message: 'Data par stock', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.upsertParStocks = async (req, res) => {
  try {
    const outlet_id = req.body.outlet_id;
    if (!outlet_id) return res.status(400).json({ success: false, message: 'outlet_id diperlukan' });

    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });

    await ParStockService.upsertParStocks(parseInt(outlet_id), parsed.data.updates);
    res.json({ success: true, message: 'Par stock berhasil diperbarui' });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
