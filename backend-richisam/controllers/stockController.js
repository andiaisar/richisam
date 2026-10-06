const StockService = require('../services/stockService');

exports.getLowStocks = async (req, res) => {
  try {
    const outlet_id = req.query.outlet_id || (req.body && req.body.outlet_id);
    const result = await StockService.getLowStocks(outlet_id ? parseInt(outlet_id) : null);
    res.json({ success: true, message: 'Daftar stok di bawah/sama dengan batas aman', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getStocks = async (req, res) => {
  try {
    const outlet_id = req.query.outlet_id || (req.body && req.body.outlet_id);
    const result = await StockService.getStocks(outlet_id ? parseInt(outlet_id) : null, page, limit);
    res.json({ success: true, message: 'Daftar stok', data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
