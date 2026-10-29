const AnalyticsService = require('../services/analyticsService');

const getTargetOutletId = (req, queryOutletId) => {
  if (req.user.role === 'STAF_CABANG') {
    return req.user.outlet_id;
  }
  if (req.user.role === 'ADMIN_GUDANG') {
    return queryOutletId || req.user.outlet_id || 1;
  }
  return queryOutletId || null;
};

const getABCAnalysis = async (req, res) => {
  try {
    const { start_date, end_date, outlet_id } = req.query;
    const targetOutletId = getTargetOutletId(req, outlet_id);
    
    // Default to last 30 days if no date provided
    let sDate = start_date;
    let eDate = end_date;
    if (!sDate || !eDate) {
      const today = new Date();
      eDate = today.toISOString().split('T')[0];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      sDate = thirtyDaysAgo.toISOString().split('T')[0];
    }

    const result = await AnalyticsService.getABCAnalysis(targetOutletId, sDate, eDate);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mengambil analisis ABC' });
  }
};

const getDemandForecast = async (req, res) => {
  try {
    const { outlet_id, product_id, history_days } = req.query;
    const targetOutletId = getTargetOutletId(req, outlet_id);
    if (!targetOutletId || !product_id) {
      return res.status(400).json({ error: 'outlet_id dan product_id wajib diisi' });
    }
    
    const days = history_days ? parseInt(history_days) : 7;
    const result = await AnalyticsService.getDemandForecast(targetOutletId, product_id, days);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal melakukan peramalan kebutuhan (Forecasting)' });
  }
};

const getVisualCharts = async (req, res) => {
  try {
    const outlet_id = getTargetOutletId(req, req.query.outlet_id);
    const result = await AnalyticsService.getVisualCharts(outlet_id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('getVisualCharts error:', error);
    res.status(500).json({ success: false, error: 'Gagal mengambil data grafik visual' });
  }
};

module.exports = {
  getABCAnalysis,
  getDemandForecast,
  getVisualCharts
};
