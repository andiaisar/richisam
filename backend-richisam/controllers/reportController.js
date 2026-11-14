const ReportService = require('../services/reportService');

// bulan (1–12) dan tahun (2000–2100) opsional; bila dikirim harus valid agar tidak diam-diam diganti / memicu error 500
const invalidPeriod = (bulan, tahun) => {
  const filled = (v) => v !== undefined && v !== null && v !== '';
  if (filled(bulan) && !(/^\d{1,2}$/.test(String(bulan)) && Number(bulan) >= 1 && Number(bulan) <= 12)) return 'Bulan harus berupa angka 1–12';
  if (filled(tahun) && !(/^\d{4}$/.test(String(tahun)) && Number(tahun) >= 2000 && Number(tahun) <= 2100)) return 'Tahun tidak valid (2000–2100)';
  return null;
};

exports.getMutationsReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) return res.status(400).json({ success: false, message: 'start_date dan end_date diperlukan' });

    const outlet_id = req.query.outlet_id || req.body?.outlet_id; // from enforceOutletScope
    const data = await ReportService.getMutationsReport(outlet_id ? parseInt(outlet_id) : null, start_date, end_date);
    res.json({ success: true, message: 'Laporan Mutasi', data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getDefectsReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) return res.status(400).json({ success: false, message: 'start_date dan end_date diperlukan' });

    const data = await ReportService.getDefectsReport(start_date, end_date);
    res.json({ success: true, message: 'Laporan Defect', data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const outlet_id = req.user.role === 'STAF_CABANG' ? req.user.outlet_id : (req.query.outlet_id ? parseInt(req.query.outlet_id) : null);
    const { bulan, tahun } = req.query || {};
    const data = await ReportService.getDashboardStats(outlet_id, bulan, tahun);
    res.json({ success: true, message: 'Dashboard Stats', data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getMonthlyRecap = async (req, res) => {
  try {
    const periodError = invalidPeriod(req.query.bulan, req.query.tahun);
    if (periodError) return res.status(400).json({ success: false, message: periodError });
    const now = new Date();
    const bulan = parseInt(req.query.bulan) || (now.getMonth() + 1);
    const tahun = parseInt(req.query.tahun) || now.getFullYear();
    const rawOutletId = req.user.role === 'STAF_CABANG'
      ? req.user.outlet_id
      : (req.query.outlet_id || req.body?.outlet_id || null);
    const outlet_id = rawOutletId ? parseInt(rawOutletId) : null;

    const data = await ReportService.getMonthlyRecap(outlet_id, bulan, tahun);
    res.json({ success: true, message: 'Rekap Bulanan', data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.exportMutationsExcel = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) return res.status(400).json({ success: false, message: 'start_date dan end_date diperlukan' });

    const outlet_id = req.query.outlet_id || req.body?.outlet_id || (req.user?.role === 'STAF_CABANG' ? req.user.outlet_id : null);
    const buffer = await ReportService.exportMutationsExcel(outlet_id ? parseInt(outlet_id) : null, start_date, end_date);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Laporan_Mutasi_${start_date}_sampai_${end_date}.xlsx"`);
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.exportMonthlyExcel = async (req, res) => {
  try {
    const { bulan, tahun } = req.query;
    if (!bulan || !tahun) return res.status(400).json({ success: false, message: 'bulan dan tahun diperlukan' });
    const periodError = invalidPeriod(bulan, tahun);
    if (periodError) return res.status(400).json({ success: false, message: periodError });

    const outlet_id = req.query.outlet_id || req.body?.outlet_id || req.user?.outlet_id || 1;
    if (!outlet_id) return res.status(400).json({ success: false, message: 'outlet_id diperlukan' });

    const buffer = await ReportService.exportMonthlyExcel(parseInt(outlet_id), parseInt(bulan), parseInt(tahun));

    const monthStr = bulan.toString().padStart(2, '0');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Laporan_Stok_Outlet_${outlet_id}_${monthStr}-${tahun}.xlsx"`);
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
