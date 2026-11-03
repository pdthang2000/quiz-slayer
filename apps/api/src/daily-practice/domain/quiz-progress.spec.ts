import type { QuizAnswered } from './events';
import { DailySessionId, QuizId, UserId } from './ids';
import { LocalDate } from './local-date';
import { QuizProgress } from './quiz-progress';

let sessionNo = 0;
const answered = (day: string, correct: boolean): QuizAnswered => ({
  type: 'QuizAnswered',
  sessionId: DailySessionId(`s${++sessionNo}`),
  userId: UserId('u1'),
  quizId: QuizId('q7'),
  day,
  answeredAt: `${day}T03:00:00.000Z`,
  correct,
});

const due = (p: QuizProgress) =>
  p.mistake && { stage: p.mistake.stage, dueOn: p.mistake.dueOn.value };

describe('QuizProgress', () => {
  it('DP-27: a quiz is seen once answered; right the first time = no mistake', () => {
    const p = QuizProgress.firstAnswer(answered('2026-11-02', true));
    expect(p.mistake).toBeNull();
    expect(p.lastAnsweredAt.toISOString()).toBe('2026-11-02T03:00:00.000Z');
  });

  it('DP-08: a wrong answer comes back after 1, 3 and 7 days', () => {
    const p = QuizProgress.firstAnswer(answered('2026-11-02', false));
    expect(due(p)).toEqual({ stage: 1, dueOn: '2026-11-03' });
  });

  it('DP-33: Mon 3 wrong → Tue 4 · right → Fri 7 · wrong → Sat 8 · right → Tue 11 · right → Tue 18 · right → retired', () => {
    const p = QuizProgress.firstAnswer(answered('2026-11-02', false)); // Mon 2 Nov
    expect(due(p)).toEqual({ stage: 1, dueOn: '2026-11-03' });
    p.apply(answered('2026-11-03', true));
    expect(due(p)).toEqual({ stage: 3, dueOn: '2026-11-06' });
    p.apply(answered('2026-11-06', false));
    expect(due(p)).toEqual({ stage: 1, dueOn: '2026-11-07' });
    p.apply(answered('2026-11-07', true));
    expect(due(p)).toEqual({ stage: 3, dueOn: '2026-11-10' });
    p.apply(answered('2026-11-10', true));
    expect(due(p)).toEqual({ stage: 7, dueOn: '2026-11-17' });
    p.apply(answered('2026-11-17', true));
    expect(p.mistake).toBeNull(); // retired
  });

  it('DP-33: counted from the day of the answer, even when the comeback was late', () => {
    const p = QuizProgress.firstAnswer(answered('2026-11-02', false));
    p.apply(answered('2026-11-09', true)); // due the 3rd, answered a week later
    expect(due(p)).toEqual({ stage: 3, dueOn: '2026-11-12' });
    expect(p.isDueOn(LocalDate.parse('2026-11-11'))).toBe(false);
    expect(p.isDueOn(LocalDate.parse('2026-11-12'))).toBe(true);
    expect(p.isDueOn(LocalDate.parse('2026-11-20'))).toBe(true); // missed days: still due
  });

  it('DP-37: one progress per user and quiz, whichever track served it', () => {
    const p = QuizProgress.firstAnswer({ ...answered('2026-11-02', false) });
    p.apply({ ...answered('2026-11-03', true) }); // e.g. served by #grammar instead of #HSK4
    expect(p.quizId).toBe('q7');
    expect(due(p)).toEqual({ stage: 3, dueOn: '2026-11-06' });
  });

  it('DP-38: progress never depends on the pool; it is kept as it is', () => {
    const p = QuizProgress.firstAnswer(answered('2026-11-02', false));
    // eslint-disable-next-line no-restricted-syntax
    const later = QuizProgress.reconstitute(p.toSnapshot());
    expect(due(later)).toEqual({ stage: 1, dueOn: '2026-11-03' });
  });

  it('applying the same answer twice changes nothing (idempotent, B-10)', () => {
    const first = answered('2026-11-02', false);
    const p = QuizProgress.firstAnswer(first);
    const again = answered('2026-11-03', true);
    expect(p.apply(again)).toBe(true);
    expect(p.apply(again)).toBe(false);
    expect(due(p)).toEqual({ stage: 3, dueOn: '2026-11-06' });
  });
});
