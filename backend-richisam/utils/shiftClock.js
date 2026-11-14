// Penentuan tanggal & shift operasional "saat ini" yang konsisten untuk seluruh pencatatan otomatis
// (pengiriman/penerimaan tiket, CITO, transfer, defect), terlepas dari zona waktu server (lokal WITA / Vercel UTC).
//
// Shift: PAGI 06:00–13:59, SORE 14:00–21:59, MIDNIGHT 22:00–05:59.
// Shift MIDNIGHT milik tanggal saat shift dimulai (sesuai getPreviousShift: SAW PAGI = SAK MIDNIGHT hari sebelumnya),
// sehingga pukul 00:00–05:59 dicatat pada MIDNIGHT tanggal sebelumnya.

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Makassar';

const pad = (n) => String(n).padStart(2, '0');

const currentShift = (now = new Date()) => {
  const parts = {};
  new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
  }).formatToParts(now).forEach((p) => { parts[p.type] = p.value; });

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour);

  if (hour >= 6 && hour < 14) return { tanggal: `${year}-${pad(month)}-${pad(day)}`, shift: 'PAGI' };
  if (hour >= 14 && hour < 22) return { tanggal: `${year}-${pad(month)}-${pad(day)}`, shift: 'SORE' };
  if (hour >= 22) return { tanggal: `${year}-${pad(month)}-${pad(day)}`, shift: 'MIDNIGHT' };

  // 00:00–05:59 → lanjutan shift MIDNIGHT yang dimulai kemarin
  const prev = new Date(Date.UTC(year, month - 1, day - 1));
  return { tanggal: `${prev.getUTCFullYear()}-${pad(prev.getUTCMonth() + 1)}-${pad(prev.getUTCDate())}`, shift: 'MIDNIGHT' };
};

module.exports = { currentShift, APP_TIMEZONE };
