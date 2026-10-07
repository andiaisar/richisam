const AssetService = require('../services/assetService');

exports.createAsset = async (req, res) => {
  try {
    const result = await AssetService.createAsset(req.body);
    res.status(201).json({ success: true, message: 'Aset dibuat', data: result });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.updateAsset = async (req, res) => {
  try {
    const result = await AssetService.updateAsset(req.params.id, req.body);
    res.json({ success: true, message: 'Aset diupdate', data: result });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.deleteAsset = async (req, res) => {
  try {
    await AssetService.deleteAsset(req.params.id);
    res.json({ success: true, message: 'Aset dihapus' });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.getAssets = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const result = await AssetService.getAssets(page, limit, search);
    res.json({ success: true, message: 'Daftar Aset', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getAssetStocks = async (req, res) => {
  try {
    const outlet_id = req.query.outlet_id;
    if (!outlet_id) return res.status(400).json({ success: false, message: 'outlet_id diperlukan' });
    const result = await AssetService.getAssetStocks(outlet_id);
    res.json({ success: true, message: 'Stok Aset', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateAssetStocks = async (req, res) => {
  try {
    const { items } = req.body;
    const outlet_id = req.query.outlet_id;
    if (!outlet_id || !items) return res.status(400).json({ success: false, message: 'outlet_id dan items diperlukan' });
    
    await AssetService.updateAssetStocks(outlet_id, items);
    res.json({ success: true, message: 'Stok Aset diupdate' });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
