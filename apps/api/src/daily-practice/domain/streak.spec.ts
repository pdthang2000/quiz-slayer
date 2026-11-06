import { LocalDate } from './local-date';
import { bestStreak, streakLength } from './streak';

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

describe('DP-65: streak while yesterday can still be finished', () => {
  const tue = LocalDate.parse('2026-11-10');

  it('DP-65: the streak is 0 while yesterday is unfinished', () => {
    const finished = ['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'];
    expect(streakLength(finished, tue)).toBe(0); // Sun ✓, Mon 3/10, today Tue
  });

  it('DP-65: finishing yesterday in time brings the streak back', () => {
    const finished = [
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09', // Monday, finished on Tuesday (it counts for Monday, DP-52)
    ];
    expect(streakLength(finished, tue)).toBe(5);
    expect(streakLength([...finished, '2026-11-10'], tue)).toBe(6);
  });

  it("DP-65: today's set finished while yesterday is not: only today counts", () => {
    expect(streakLength(['2026-11-08', '2026-11-10'], tue)).toBe(1);
  });
});

describe('DP-69: best streak', () => {
  const run = (start: string, days: number) =>
    Array.from(
      { length: days },
      (_, i) => LocalDate.parse(start).addDays(i).value,
    );

  it('DP-69: the longest run ever, even when the current streak is 0', () => {
    const finished = [...run('2026-10-01', 12), ...run('2026-10-20', 3)];
    expect(bestStreak(finished)).toBe(12);
    expect(streakLength(finished, LocalDate.parse('2026-11-07'))).toBe(0);
  });

  it('DP-69: the current run counts', () => {
    expect(bestStreak([...run('2026-10-01', 2), ...run('2026-11-01', 5)])).toBe(
      5,
    );
  });

  it('DP-69: order and duplicate days (overall: two tracks) do not matter', () => {
    expect(
      bestStreak(['2026-11-03', '2026-11-01', '2026-11-02', '2026-11-02']),
    ).toBe(3);
  });

  it('DP-69: runs over a month end; no finished day → 0', () => {
    expect(bestStreak(['2026-10-31', '2026-11-01'])).toBe(2);
    expect(bestStreak([])).toBe(0);
  });
});
