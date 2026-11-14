const { currentShift } = require('../utils/shiftClock');

// Waktu dinyatakan dalam UTC; WITA = UTC+8. Hasil tidak boleh bergantung pada zona waktu server.
describe('currentShift (tanggal & shift operasional WITA)', () => {
  const cases = [
    ['2026-11-14T22:00:00Z', '2026-11-15', 'PAGI'],      // 06:00 WITA (batas awal PAGI)
    ['2026-11-14T05:59:00Z', '2026-11-14', 'PAGI'],      // 13:59 WITA
    ['2026-11-14T06:00:00Z', '2026-11-14', 'SORE'],      // 14:00 WITA (batas awal SORE)
    ['2026-11-14T13:59:00Z', '2026-11-14', 'SORE'],      // 21:59 WITA
    ['2026-11-14T14:00:00Z', '2026-11-14', 'MIDNIGHT'],  // 22:00 WITA (batas awal MIDNIGHT)
    ['2026-11-14T17:30:00Z', '2026-11-14', 'MIDNIGHT'],  // 01:30 WITA 15 Nov → MIDNIGHT 14 Nov
    ['2026-11-14T21:59:00Z', '2026-11-14', 'MIDNIGHT'],  // 05:59 WITA 15 Nov → MIDNIGHT 14 Nov
    ['2026-12-31T16:30:00Z', '2026-12-31', 'MIDNIGHT'],  // 00:30 WITA 1 Jan → MIDNIGHT 31 Des
  ];
  it.each(cases)('%s → %s %s', (iso, tanggal, shift) => {
    expect(currentShift(new Date(iso))).toEqual({ tanggal, shift });
  });
});
