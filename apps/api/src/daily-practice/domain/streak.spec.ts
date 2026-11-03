import { LocalDate } from './local-date';
import { streakLength } from './streak';

const day = (value: string) => LocalDate.parse(value);

describe('streakLength', () => {
  it('DP-06: Mon ✓ Tue — Wed ✓ → streak 1 (restarted Wed)', () => {
    expect(streakLength(['2026-11-02', '2026-11-04'], day('2026-11-04'))).toBe(
      1,
    );
  });

  it('DP-06: a missed day is gone: yesterday missed and today not done → 0', () => {
    expect(streakLength(['2026-11-02'], day('2026-11-04'))).toBe(0);
  });

  it("DP-23: today's set not finished yet keeps the streak through yesterday", () => {
    expect(streakLength(['2026-11-02', '2026-11-03'], day('2026-11-04'))).toBe(
      2,
    );
    expect(
      streakLength(
        ['2026-11-02', '2026-11-03', '2026-11-04'],
        day('2026-11-04'),
      ),
    ).toBe(3);
  });

  it('DP-19: a track streak and the overall streak (a day counts if any track finished)', () => {
    const hsk3 = ['2026-11-02', '2026-11-03', '2026-11-05']; // Mon Tue — Thu
    const toeic = ['2026-11-02', '2026-11-04', '2026-11-05']; // Mon — Wed Thu
    const thu = day('2026-11-05');
    expect(streakLength(hsk3, thu)).toBe(1);
    expect(streakLength(toeic, thu)).toBe(2);
    expect(streakLength([...hsk3, ...toeic], thu)).toBe(4);
  });
});
