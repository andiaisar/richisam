const OpnameService = require('../services/opnameService');

exports.createOpname = async (req, res) => {
  try {
    const { outlet_id, tanggal } = req.body;
    if (!outlet_id || !tanggal) {
       return res.status(400).json({ success: false, message: 'outlet_id dan tanggal diperlukan' });
    }
    const result = await OpnameService.createOpname(outlet_id, tanggal, req.user.id);
    res.status(201).json({ success: true, message: 'Opname DRAFT dibuat', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateOpnameItems = async (req, res) => {
  try {
    const { items, asset_items } = req.body;
    const { id } = req.params;
    if (!items) {
      return res.status(400).json({ success: false, message: 'items diperlukan' });
    }
    await OpnameService.updateOpnameItems(id, items, asset_items || []);
    res.json({ success: true, message: 'Item opname berhasil disimpan' });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.finalizeOpname = async (req, res) => {
  try {
    const { id } = req.params;
    const { apply_adjustment } = req.body;
    await OpnameService.finalizeOpname(id, apply_adjustment, req.user.id);
    res.json({ success: true, message: 'Opname difinalisasi' });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.getOpnames = async (req, res) => {
  try {
    // enforceOutletScope middleware handles setting outlet_id if user is STAF_CABANG
    const outlet_id = req.query.outlet_id;
    const result = await OpnameService.getOpnames(outlet_id);
    res.json({ success: true, message: 'Daftar Opname', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getOpnameById = async (req, res) => {
  try {
    const result = await OpnameService.getOpnameById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
