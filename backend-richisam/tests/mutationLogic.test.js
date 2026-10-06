const MutationService = require('../services/mutationService');

describe('MutationService Shift Chain Logic', () => {
  it('should get previous shift for SORE on the same day', () => {
    const prev = MutationService.getPreviousShift('2023-10-15', 'SORE');
    expect(prev).toEqual({ date: '2023-10-15', shift: 'PAGI' });
  });

  it('should get previous shift for PAGI on the same day', () => {
    const prev = MutationService.getPreviousShift('2023-10-15', 'PAGI');
    expect(prev).toEqual({ date: '2023-10-15', shift: 'MIDNIGHT' });
  });

  it('should get previous shift for MIDNIGHT on the PREVIOUS day', () => {
    const prev = MutationService.getPreviousShift('2023-10-15', 'MIDNIGHT');
    expect(prev).toEqual({ date: '2023-10-14', shift: 'SORE' });
  });

  it('should get previous shift across month boundary', () => {
    const prev = MutationService.getPreviousShift('2023-11-01', 'MIDNIGHT');
    expect(prev).toEqual({ date: '2023-10-31', shift: 'SORE' });
  });

  it('should get previous shift across leap year boundary', () => {
    const prev = MutationService.getPreviousShift('2024-03-01', 'MIDNIGHT');
    expect(prev).toEqual({ date: '2024-02-29', shift: 'SORE' });
  });
});
