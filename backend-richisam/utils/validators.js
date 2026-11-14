// Validator kecil yang dipakai bersama oleh beberapa controller.

/** true bila string berformat YYYY-MM-DD DAN tanggalnya benar-benar ada di kalender (mis. menolak 2026-02-30). */
const isValidDateString = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

/** Kosong ('' / null / undefined) dianggap tidak diisi. */
const isBlank = (value) => value === '' || value === null || value === undefined;

/** Bilangan bulat >= min (menerima number atau string angka). */
const isIntAtLeast = (value, min) => {
  if (isBlank(value) || typeof value === 'boolean') return false;
  const n = Number(value);
  return Number.isInteger(n) && n >= min;
};

/** ID numerik positif. */
const isPositiveId = (value) => isIntAtLeast(value, 1);

module.exports = { isValidDateString, isBlank, isIntAtLeast, isPositiveId };
