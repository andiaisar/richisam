const ImportService = require('../services/importService');

exports.importMutations = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File Excel diperlukan' });
    }
    
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Ukuran file maksimal 5 MB' });
    }
    
    if (req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return res.status(400).json({ success: false, message: 'Hanya menerima file .xlsx' });
    }

    const { outlet_id, bulan, tahun } = req.body;
    if (!outlet_id || !bulan || !tahun) {
       return res.status(400).json({ success: false, message: 'outlet_id, bulan, dan tahun diperlukan di body' });
    }

    const dryRun = req.query.dry_run === 'true';

    const report = await ImportService.parseAndImport(
      req.file.buffer, 
      parseInt(outlet_id), 
      req.user.id, 
      dryRun, 
      parseInt(bulan), 
      parseInt(tahun)
    );

    res.json({
      success: true,
      message: dryRun ? 'Preview Import berhasil (Dry Run)' : 'Data berhasil diimport',
      report
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
