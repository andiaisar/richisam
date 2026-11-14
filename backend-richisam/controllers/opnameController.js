const OpnameService = require('../services/opnameService');
const AuditService = require('../services/auditService');
const { isBlank, isIntAtLeast } = require('../utils/validators');

exports.createOpname = async (req, res) => {
  try {
    const { outlet_id, tanggal } = req.body;
    if (!outlet_id || !tanggal) {
       return res.status(400).json({ success: false, message: 'outlet_id dan tanggal diperlukan' });
    }
    const result = await OpnameService.createOpname(outlet_id, tanggal, req.user.id);
    AuditService.logAction({
      userId: req.user?.id,
      userName: req.user?.nama || req.user?.username,
      role: req.user?.role,
      outletId: outlet_id,
      module: 'OPNAME',
      action: 'CREATE',
      description: `Membuat draf Stok Opname ${result?.kode || ''} untuk tanggal ${tanggal}.`,
      details: { kode_opname: result?.kode, tanggal, status: 'DRAFT' }
    });
    res.status(201).json({ success: true, message: 'Opname DRAFT dibuat', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateOpnameItems = async (req, res) => {
  try {
    const { items, asset_items } = req.body;
    const { id } = req.params;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'items diperlukan' });
    }
    // Hasil hitung fisik harus bilangan bulat >= 0
    const badItem = [...items, ...(Array.isArray(asset_items) ? asset_items : [])]
      .find(it => !isBlank(it.qty_fisik) && !isIntAtLeast(it.qty_fisik, 0));
    if (badItem) {
      return res.status(400).json({ success: false, message: `Qty fisik harus bilangan bulat dan tidak boleh negatif (nilai: ${badItem.qty_fisik})` });
    }
    const existing = await OpnameService.getOpnameById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Opname tidak ditemukan' });
    }
    if (req.user.role === 'STAF_CABANG' && Number(existing.outlet_id) !== Number(req.user.outlet_id)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak: Anda tidak dapat mengubah opname cabang lain' });
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
    AuditService.logAction({
      userId: req.user?.id,
      userName: req.user?.nama || req.user?.username,
      role: req.user?.role,
      outletId: req.user?.outlet_id,
      module: 'OPNAME',
      action: 'FINALIZE',
      description: `Finalisasi Stok Opname ID #${id} (Penyesuaian fisik: ${apply_adjustment ? 'Diterapkan' : 'Tanpa penyesuaian'}).`,
      details: { opname_id: id, status: 'FINAL', penyesuaian_stok_diterapkan: Boolean(apply_adjustment) }
    });
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
    if (req.user.role === 'STAF_CABANG' && Number(result.outlet_id) !== Number(req.user.outlet_id)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak: Opname milik cabang lain' });
    }
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
