import type { QuizId } from './ids';
import type { LocalDate } from './local-date';
import type { Mistake } from './quiz-progress';

/** A quiz of the pool and what the user has done with it so far. */
export type PoolQuiz = {
  quizId: QuizId;
  /** Absent = never answered (DP-27). */
  progress?: { lastAnsweredAt: Date; mistake: Mistake | null };
};

export type DailySet = {
  quizIds: QuizId[];
  /** DP-14: fewer than the daily size matched. */
  short: boolean;
};

export type Random = () => number;

function shuffled<T>(items: readonly T[], random: Random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const byTime = (a: Date, b: Date) => a.getTime() - b.getTime();

/**
 * How a day's set is built (daily-practice.md; DP-30, DP-34, DP-35, DP-36, DP-28, DP-14).
 * The pool is already the track's tag + allowed kinds + system and own quizzes (DP-11,
 * DP-12, QB-10); `excluded` = quizzes already in today's other sets (DP-39).
 *   1. due mistakes, oldest due first, up to half of the daily size, rounded down
 *   2. never answered, random, up to the daily size
 *   3. more due mistakes, if still short
 *   4. already seen and not waiting as a mistake, oldest answered first
 *   5. still short → what's there (DP-14)
 * Mistakes not due yet never fill a short day (DP-34). The set keeps this order
 * (provisional, G-11).
 */
export function buildDailySet(input: {
  pool: readonly PoolQuiz[];
  excluded: ReadonlySet<QuizId>;
  dailySize: number;
  today: LocalDate;
  random?: Random;
}): DailySet {
  const { dailySize, today, random = Math.random } = input;
  const pool = input.pool.filter((q) => !input.excluded.has(q.quizId));

  const due = pool
    .filter(
      (q) => q.progress?.mistake && !q.progress.mistake.dueOn.isAfter(today),
    )
    .sort(
      (a, b) =>
        a.progress!.mistake!.dueOn.value.localeCompare(
          b.progress!.mistake!.dueOn.value,
        ) || byTime(a.progress!.lastAnsweredAt, b.progress!.lastAnsweredAt),
    );
  const fresh = shuffled(
    pool.filter((q) => !q.progress),
    random,
  );
  const seen = pool
    .filter((q) => q.progress && !q.progress.mistake)
    .sort((a, b) =>
      byTime(a.progress!.lastAnsweredAt, b.progress!.lastAnsweredAt),
    );

  const chosen: QuizId[] = [];
  const take = (from: readonly PoolQuiz[], upTo: number) => {
    for (const q of from) {
      if (chosen.length >= upTo) break;
      if (!chosen.includes(q.quizId)) chosen.push(q.quizId);
    }
  };

  take(due, Math.floor(dailySize / 2)); // DP-30, DP-36
  take(fresh, dailySize);
  take(due, dailySize); // DP-35
  take(seen, dailySize); // DP-28
  return { quizIds: chosen, short: chosen.length < dailySize };
}
