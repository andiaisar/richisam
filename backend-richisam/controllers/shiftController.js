const ShiftService = require('../services/shiftService');
const pool = require('../config/db');

exports.getOutletsStatus = async (req, res) => {
  try {
    let { tanggal, shift } = req.query;
    if (!tanggal) tanggal = new Date().toISOString().split('T')[0];
    if (!shift) shift = 'PAGI';

    const list = await ShiftService.getOutletsStatus(tanggal, shift);
    res.json({
      success: true,
      message: 'Status shift seluruh cabang',
      data: list
    });
  } catch (err) {
    console.error('shiftController.getOutletsStatus error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat status shift cabang: ' + err.message
    });
  }
};

exports.getShiftSummary = async (req, res) => {
  try {
    let { outlet_id, tanggal, shift } = req.query;

    if (req.user.role === 'STAF_CABANG') {
      outlet_id = req.user.outlet_id;
    }

    if (!outlet_id) {
      // Default to first outlet if not provided
      const firstOutlet = await pool.query('SELECT id FROM outlets ORDER BY id ASC LIMIT 1');
      outlet_id = firstOutlet.rows[0]?.id;
    }

    if (!tanggal) {
      tanggal = new Date().toISOString().split('T')[0];
    }

    if (!shift) {
      shift = 'PAGI';
    }

    const summary = await ShiftService.getShiftSummary(outlet_id, tanggal, shift);
    res.json({
      success: true,
      message: 'Ringkasan operasional shift',
      data: summary
    });
  } catch (err) {
    console.error('shiftController.getShiftSummary error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat ringkasan shift: ' + err.message
    });
  }
};

exports.closeShift = async (req, res) => {
  try {
    let { outlet_id, tanggal, shift, notes } = req.body;

    if (req.user.role === 'STAF_CABANG') {
      outlet_id = req.user.outlet_id;
    }

    if (!outlet_id || !tanggal || !shift) {
      return res.status(400).json({
        success: false,
        message: 'outlet_id, tanggal, dan shift wajib diisi.'
      });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    let userName = req.user.nama || req.user.username;
    if (!userName) {
      const uRes = await pool.query('SELECT nama FROM users WHERE id = $1', [req.user.id]);
      userName = uRes.rows[0]?.nama || 'Staf';
    }

    const result = await ShiftService.closeShift({
      outletId: parseInt(outlet_id),
      date: tanggal,
      shiftName: shift,
      notes: notes || '',
      userId: req.user.id,
      userRole: req.user.role,
      userName,
      ipAddress
    });

    res.json({
      success: true,
      message: `Shift ${shift} tanggal ${tanggal} berhasil ditutup dan dikunci.`,
      data: result
    });
  } catch (err) {
    console.error('shiftController.closeShift error:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Gagal menutup shift.'
    });
  }
};

exports.unlockShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    let userName = req.user.nama || req.user.username;
    if (!userName) {
      const uRes = await pool.query('SELECT nama FROM users WHERE id = $1', [req.user.id]);
      userName = uRes.rows[0]?.nama || 'Supervisor';
    }

    const result = await ShiftService.unlockShift({
      closingId: parseInt(id),
      userId: req.user.id,
      userRole: req.user.role,
      userName,
      reason: reason || 'Koreksi administratif',
      ipAddress
    });

    res.json({
      success: true,
      message: 'Kunci shift berhasil dibuka. Staf dapat melakukan revisi mutasi.',
      data: result
    });
  } catch (err) {
    console.error('shiftController.unlockShift error:', err);
    res.status(403).json({
      success: false,
      message: err.message || 'Gagal membuka kunci shift.'
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    let { outlet_id, page, limit, start_date, end_date, status } = req.query;

    if (req.user.role === 'STAF_CABANG') {
      outlet_id = req.user.outlet_id;
    } else if (outlet_id === 'ALL' || outlet_id === '' || outlet_id === 'undefined' || outlet_id === 'null') {
      outlet_id = null;
    }

    const result = await ShiftService.getShiftHistory({
      outletId: outlet_id ? parseInt(outlet_id) : null,
      page: page || 1,
      limit: limit || 15,
      startDate: start_date,
      endDate: end_date,
      status: status || null
    });

    res.json({
      success: true,
      message: 'Riwayat tutup buku shift',
      ...result
    });
  } catch (err) {
    console.error('shiftController.getHistory error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat riwayat shift: ' + err.message
    });
  }
};
