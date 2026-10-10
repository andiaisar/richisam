const AnalyticsService = require('../services/analyticsService');

const getABCAnalysis = async (req, res) => {
  try {
    const { start_date, end_date, outlet_id } = req.query;
    
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

    const result = await AnalyticsService.getABCAnalysis(outlet_id, sDate, eDate);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mengambil analisis ABC' });
  }
};

const getDemandForecast = async (req, res) => {
  try {
    const { outlet_id, product_id, history_days } = req.query;
    if (!outlet_id || !product_id) {
      return res.status(400).json({ error: 'outlet_id dan product_id wajib diisi' });
    }
    
    const days = history_days ? parseInt(history_days) : 7;
    const result = await AnalyticsService.getDemandForecast(outlet_id, product_id, days);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal melakukan peramalan kebutuhan (Forecasting)' });
  }
};

module.exports = {
  getABCAnalysis,
  getDemandForecast
};
