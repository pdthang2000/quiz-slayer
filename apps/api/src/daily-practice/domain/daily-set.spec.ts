import { buildDailySet, type PoolQuiz } from './daily-set';
import { QuizId } from './ids';
import { LocalDate } from './local-date';
import type { MistakeStage } from './quiz-progress';

const TODAY = LocalDate.parse('2026-11-10');
const noRandom = () => 0.999; // Fisher–Yates keeps the order with random ≈ 1

const fresh = (id: string): PoolQuiz => ({ quizId: QuizId(id) });
const seen = (id: string, answered: string): PoolQuiz => ({
  quizId: QuizId(id),
  progress: {
    lastAnsweredAt: new Date(`${answered}T00:00:00Z`),
    mistake: null,
  },
});
const mistake = (
  id: string,
  dueOn: string,
  stage: MistakeStage = 1,
): PoolQuiz => ({
  quizId: QuizId(id),
  progress: {
    lastAnsweredAt: new Date('2026-11-01T00:00:00Z'),
    mistake: { stage, dueOn: LocalDate.parse(dueOn) },
  },
});

const ids = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);

const build = (pool: PoolQuiz[], dailySize: number, excluded: string[] = []) =>
  buildDailySet({
    pool,
    dailySize,
    today: TODAY,
    excluded: new Set(excluded.map(QuizId)),
    random: noRandom,
  });

describe('buildDailySet', () => {
  it('DP-30: daily size 10, 7 mistakes due → 5 mistakes (oldest due first) + 5 new', () => {
    const mistakes = ids('m', 7).map((id, i) =>
      mistake(id, `2026-11-0${9 - i}`),
    ); // m7 is oldest
    const set = build([...mistakes, ...ids('n', 20).map(fresh)], 10);
    expect(set.quizIds).toEqual([
      'm7',
      'm6',
      'm5',
      'm4',
      'm3',
      'n1',
      'n2',
      'n3',
      'n4',
      'n5',
    ]);
    expect(set.short).toBe(false);
  });

  it('DP-36: half rounds down: daily size 5 → at most 2 mistakes', () => {
    const set = build(
      [
        ...ids('m', 5).map((id) => mistake(id, '2026-11-09')),
        ...ids('n', 9).map(fresh),
      ],
      5,
    );
    expect(set.quizIds.filter((id) => id.startsWith('m'))).toHaveLength(2);
    expect(set.quizIds).toHaveLength(5);
  });

  it('DP-08: picks quizzes not seen yet; random among them', () => {
    const set = buildDailySet({
      pool: [seen('s1', '2026-11-01'), ...ids('n', 3).map(fresh)],
      dailySize: 2,
      today: TODAY,
      excluded: new Set(),
      random: () => 0,
    });
    expect(set.quizIds).toEqual(['n2', 'n3']); // random 0 rotates the order
  });

  it('DP-35: when never-answered quizzes run out, extra due mistakes come before seen quizzes', () => {
    const set = build(
      [
        ...ids('m', 6).map((id) => mistake(id, '2026-11-10')),
        fresh('n1'),
        seen('s1', '2026-10-01'),
      ],
      10,
    );
    expect(set.quizIds).toEqual([
      'm1',
      'm2',
      'm3',
      'm4',
      'm5',
      'n1',
      'm6',
      's1',
    ]);
  });

  it('DP-34: a mistake that is not due yet never fills a short day', () => {
    const set = build([mistake('m1', '2026-11-11'), fresh('n1')], 10);
    expect(set.quizIds).toEqual(['n1']);
    expect(set.short).toBe(true);
  });

  it('DP-28: all answered and no mistake due → start over, oldest answered first', () => {
    const set = build(
      [
        seen('s1', '2026-11-05'),
        seen('s2', '2026-10-01'),
        seen('s3', '2026-11-01'),
      ],
      2,
    );
    expect(set.quizIds).toEqual(['s2', 's3']);
  });

  it('DP-14: fewer matching quizzes than the daily size → what is there, marked short', () => {
    const set = build(ids('n', 4).map(fresh), 10);
    expect(set.quizIds).toHaveLength(4);
    expect(set.short).toBe(true);
  });

  it("DP-39: quizzes already in today's other sets are skipped; the set stays short", () => {
    const set = build([fresh('q7'), fresh('q8')], 2, ['q7']);
    expect(set.quizIds).toEqual(['q8']);
    expect(set.short).toBe(true);
  });

  it('DP-17: the daily size counts quizzes and is met exactly when enough match', () => {
    const set = build(ids('n', 30).map(fresh), 10);
    expect(set.quizIds).toHaveLength(10);
    expect(new Set(set.quizIds).size).toBe(10);
  });
});
