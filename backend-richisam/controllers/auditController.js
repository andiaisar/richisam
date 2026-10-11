const AuditService = require('../services/auditService');

exports.getLogs = async (req, res) => {
  try {
    const { page, limit, module, action, user_id, outlet_id, start_date, end_date, search } = req.query;

    // Filter outlet jika STAF_CABANG
    let targetOutletId = outlet_id;
    if (req.user.role === 'STAF_CABANG') {
      targetOutletId = req.user.outlet_id;
    }

    const result = await AuditService.getAuditLogs({
      page: page || 1,
      limit: limit || 20,
      module,
      action,
      userId: user_id,
      outletId: targetOutletId,
      startDate: start_date,
      endDate: end_date,
      search: search || ''
    });

    res.json({
      success: true,
      message: 'Log aktivitas pengguna (Audit Trail)',
      ...result
    });
  } catch (err) {
    console.error('auditController.getLogs error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil log aktivitas: ' + err.message
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await AuditService.getAuditStats();
    res.json({
      success: true,
      message: 'Statistik aktivitas audit',
      data: stats
    });
  } catch (err) {
    console.error('auditController.getStats error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil statistik audit: ' + err.message
    });
  }
};
