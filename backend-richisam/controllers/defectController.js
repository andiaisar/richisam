const { z } = require('zod');
const pool = require('../config/db');
const DefectService = require('../services/defectService');
const AuditService = require('../services/auditService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, '../public/uploads/');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn('Warning: Could not create uploadDir:', e.message);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'defect-' + uniqueSuffix + path.extname(file.originalname).toLowerCase())
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Hanya file gambar (.jpg, .jpeg, .png, .webp) dengan ukuran maksimal 2MB yang diperbolehkan!'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: fileFilter
});
exports.upload = upload;

// Cek tanda tangan biner (magic bytes) file gambar yang diunggah
const hasImageSignature = (filePath) => {
  try {
    const fd = fs.openSync(filePath, 'r');
    const head = Buffer.alloc(12);
    fs.readSync(fd, head, 0, 12, 0);
    fs.closeSync(fd);
    const isJpeg = head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF;
    const isPng = head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
    const isWebp = head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP';
    return isJpeg || isPng || isWebp;
  } catch (_) {
    return false;
  }
};

const removeUploaded = (file) => {
  if (file && file.path) {
    try { fs.unlinkSync(file.path); } catch (_) {}
  }
};

const defectSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  qty: z.coerce.number().int().positive(),
  keterangan: z.string().optional(),
  deskripsi: z.string().optional(),
  tipe: z.string().optional(),
  batch_id: z.coerce.number().int().positive().optional()
});

const updateSchema = z.object({
  status: z.enum(['DITINJAU', 'DISETUJUI', 'DITOLAK', 'SELESAI'])
});

exports.getDefects = async (req, res) => {
  try {
    const { page, limit, status } = req.query;
    const outlet_id = req.query.outlet_id || (req.body && req.body.outlet_id);
    
    const result = await DefectService.getDefects(page, limit, outlet_id, status);
    res.json({ success: true, message: 'Daftar laporan defect', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.reportDefect = async (req, res) => {
  try {
    const outlet_id = req.user.role === 'STAF_CABANG' ? req.user.outlet_id : (req.body.outlet_id || req.user.outlet_id);
    if (!outlet_id) return res.status(400).json({ success: false, message: 'outlet_id diperlukan' });

    const parsed = defectSchema.safeParse(req.body);
    if (!parsed.success) {
      removeUploaded(req.file);
      return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });
    }

    // Ekstensi & MIME bisa dipalsukan: pastikan ISI file benar-benar gambar JPG/PNG/WEBP
    if (req.file && !hasImageSignature(req.file.path)) {
      removeUploaded(req.file);
      return res.status(400).json({ success: false, message: 'File foto tidak valid: isi file bukan gambar JPG, PNG, atau WEBP.' });
    }

    let foto_url = '';
    if (req.file) {
      if (process.env.VERCEL && req.file.path && fs.existsSync(req.file.path)) {
        const mime = req.file.mimetype || 'image/jpeg';
        const b64 = fs.readFileSync(req.file.path).toString('base64');
        foto_url = `data:${mime};base64,${b64}`;
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      } else {
        foto_url = `/uploads/${req.file.filename}`;
      }
    }
    const deskripsi = parsed.data.deskripsi || parsed.data.keterangan || '';

    const defect = await DefectService.reportDefect(
      outlet_id, 
      parsed.data.product_id, 
      parsed.data.qty, 
      deskripsi, 
      foto_url, 
      req.user.id
    );

    if (parsed.data.batch_id) {
      try {
        const batchRes = await pool.query('DELETE FROM product_batches WHERE id = $1 RETURNING batch_no', [parsed.data.batch_id]);
        if (batchRes.rows[0]?.batch_no) {
          await pool.query(
            `DELETE FROM notifications WHERE tipe = 'KADALUARSA' AND is_read = false AND pesan LIKE $1`,
            [`%${batchRes.rows[0].batch_no}%`]
          );
        }
      } catch (_) {}
    }
    AuditService.logAction({
      userId: req.user?.id,
      userName: req.user?.nama || req.user?.username,
      role: req.user?.role,
      outletId: outlet_id,
      module: 'DEFECT',
      action: 'CREATE',
      description: `Melaporkan barang defect/rusak [DEF-#${defect?.id || ''}] sebanyak ${parsed.data.qty} unit (${deskripsi || 'Tanpa keterangan'}).`,
      details: { defect_id: defect?.id, product_id: parsed.data.product_id, jumlah: parsed.data.qty, alasan_kerusakan: deskripsi || '-' }
    });
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
    const actionType = parsed.data.status === 'DISETUJUI' ? 'APPROVE' : parsed.data.status === 'DITOLAK' ? 'REJECT' : 'UPDATE';
    AuditService.logAction({
      userId: req.user?.id,
      userName: req.user?.nama || req.user?.username,
      role: req.user?.role,
      outletId: defect?.outlet_id || req.user?.outlet_id,
      module: 'DEFECT',
      action: actionType,
      description: `Memproses laporan defect [DEF-#${id}] menjadi status ${parsed.data.status}.`,
      details: { defect_id: id, status_keputusan: parsed.data.status, qty: defect?.qty }
    });
    res.json({ success: true, message: `Laporan defect diubah ke ${parsed.data.status}`, data: defect });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
