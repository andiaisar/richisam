const { z } = require('zod');
const ProductService = require('../services/productService');

const productSchema = z.object({
  kode: z.string().optional(),
  nama: z.string().min(1, 'Nama wajib diisi'),
  satuan: z.string().min(1, 'Satuan wajib diisi'),
  satuan_besar: z.string().optional(),
  konversi: z.coerce.number().int().min(1).optional(),
  kategori: z.string().optional(),
  urutan: z.coerce.number().int().optional(),
  harga: z.coerce.number().min(0).optional(),
  satuan_perlu_konfirmasi: z.boolean().optional(),
  is_active: z.boolean().optional()
});

exports.getProducts = async (req, res) => {
  try {
    const { page, limit, search, kategori, status } = req.query;
    const result = await ProductService.getProducts(page, limit, search, kategori, status);
    res.json({ success: true, message: 'Daftar produk', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.checkProductUsage = async (req, res) => {
  try {
    const result = await ProductService.checkProductUsage(parseInt(req.params.id));
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });

    const product = await ProductService.createProduct(parsed.data);
    res.status(201).json({ success: true, message: 'Produk berhasil dibuat', data: product });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });

    const product = await ProductService.updateProduct(parseInt(req.params.id), parsed.data);
    res.json({ success: true, message: 'Produk berhasil diperbarui', data: product });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const mode = req.query.mode || req.body?.mode || 'auto';
    const result = await ProductService.deleteProduct(parseInt(req.params.id), mode);
    res.json({ success: true, message: result.message, data: result });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.restoreProduct = async (req, res) => {
  try {
    const product = await ProductService.restoreProduct(parseInt(req.params.id));
    res.json({ success: true, message: 'Produk berhasil diaktifkan kembali', data: product });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

