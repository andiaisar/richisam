const cron = require('node-cron');
const pool = require('../config/db');
const NotificationService = require('../services/notificationService');

const initCronJobs = () => {
  // Jalan setiap jam 06:00 pagi setiap hari
  cron.schedule('0 6 * * *', async () => {
    console.log('Menjalankan cron job: Pengecekan Par Stock (06:00)');
    try {
      const res = await pool.query('SELECT product_id, outlet_id FROM stocks');
      for (let row of res.rows) {
        await NotificationService.checkParStock(row.outlet_id, row.product_id);
      }
      console.log('Cron job Par Stock selesai.');
    } catch (e) {
      console.error('Error saat cron check par stock:', e);
    }
  });
};

module.exports = { initCronJobs };
