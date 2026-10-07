require('dotenv').config();
const ReportService = require('../services/reportService');

async function run() {
  try {
    const buffer = await ReportService.exportMonthlyExcel(1, 10, 2023);
    console.log('Success! Excel buffer size:', buffer.length);
  } catch (e) {
    console.error('Failed:', e);
  }
  process.exit(0);
}

run();
