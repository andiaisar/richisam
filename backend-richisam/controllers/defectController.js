const { z } = require('zod');
const DefectService = require('../services/defectService');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });
exports.upload = upload;

const defectSchema = z.object({
  product_id: z.string().transform(v => parseInt(v)),
  qty: z.string().transform(v => parseInt(v)),
  keterangan: z.string().optional()
});

const updateSchema = z.object({
  status: z.enum(['DISETUJUI', 'DITOLAK'])
});

exports.getDefects = async (req, res) => {
  try {
    const { page, limit, status } = req.query;
    const outlet_id = req.query.outlet_id || req.body.outlet_id;
    
    const result = await DefectService.getDefects(page, limit, outlet_id, status);
    res.json({ success: true, message: 'Daftar laporan defect', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.reportDefect = async (req, res) => {
  try {
    const outlet_id = req.body.outlet_id;
    if (!outlet_id) return res.status(400).json({ success: false, message: 'outlet_id diperlukan' });

    const parsed = defectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });

    const foto_url = req.file ? `/uploads/${req.file.filename}` : null;

    const defect = await DefectService.reportDefect(
      outlet_id, 
      parsed.data.product_id, 
      parsed.data.qty, 
      parsed.data.keterangan, 
      foto_url, 
      req.user.id
    );
    res.status(201).json({ success: true, message: 'Laporan defect berhasil dikirim', data: defect });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.processDefect = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });

    const defect = await DefectService.processDefect(id, parsed.data.status, req.user);
    res.json({ success: true, message: `Laporan defect diubah ke ${parsed.data.status}`, data: defect });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
