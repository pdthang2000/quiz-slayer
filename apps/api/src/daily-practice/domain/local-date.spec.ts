import { InvalidTimeZone } from './errors';
import { checkTimeZone, LocalDate } from './local-date';

describe('LocalDate', () => {
  it("DP-05: the day is the calendar day in the phone's timezone", () => {
    const instant = new Date('2026-11-07T18:30:00Z'); // 01:30 Sunday in Hanoi, 10:30 Saturday in LA
    expect(LocalDate.of(instant, 'Asia/Ho_Chi_Minh').value).toBe('2026-11-08');
    expect(LocalDate.of(instant, 'America/Los_Angeles').value).toBe(
      '2026-11-07',
    );
  });

  it('DP-05: an unknown or missing timezone is refused', () => {
    expect(() => checkTimeZone('Mars/Olympus')).toThrow(InvalidTimeZone);
    expect(() => checkTimeZone(undefined)).toThrow(InvalidTimeZone);
    expect(checkTimeZone('Europe/Paris')).toBe('Europe/Paris');
  });

  it('adds days across months and years', () => {
    expect(LocalDate.parse('2026-12-31').addDays(1).value).toBe('2027-01-01');
    expect(LocalDate.parse('2026-03-01').addDays(-1).value).toBe('2026-02-28');
    expect(() => LocalDate.parse('2026-02-30')).toThrow(RangeError);
  });
});
