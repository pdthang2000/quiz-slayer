import { LocalDate } from './local-date';

/**
 * DP-06, DP-19, DP-23, DP-65: consecutive days with a finished set, ending today, or
 * yesterday while today's set is not finished yet. A missed day resets it, and so does
 * yesterday's set while it is unfinished: the streak shows 0 until it is finished in time
 * (DP-52), which counts for yesterday.
 *   Mon ✓ Tue — Wed ✓ (today Wed) → 1
 *   Sun ✓ Mon 3/10 (today Tue)    → 0
 * Per track: that track's finished days. Overall: days with any finished set.
 * Computed from finished sessions, not stored (ADR-013).
 */
export function streakLength(
  finishedDays: Iterable<string>,
  today: LocalDate,
): number {
  const days = new Set(finishedDays);
  let day = days.has(today.value) ? today : today.addDays(-1);
  let length = 0;
  while (days.has(day.value)) {
    length++;
    day = day.addDays(-1);
  }
  return length;
}

/**
 * DP-69: the longest run of consecutive finished days ever, the current run included.
 *   ✓×12 · — · ✓×3 → 12
 * Computed like the streak, nothing stored; a removed and re-added track keeps it (DP-15).
 */
export function bestStreak(finishedDays: Iterable<string>): number {
  const days = [...new Set(finishedDays)].sort();
  let best = 0;
  let run = 0;
  let expected: string | null = null;
  for (const day of days) {
    run = day === expected ? run + 1 : 1;
    best = Math.max(best, run);
    expected = LocalDate.parse(day).addDays(1).value;
  }
  return best;
}
