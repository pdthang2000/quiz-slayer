import type { LocalDate } from './local-date';

/**
 * DP-06, DP-19, DP-23: consecutive days with a finished set, ending today, or yesterday
 * while today's set is not finished yet. A missed day resets it.
 *   Mon ✓ Tue — Wed ✓ (today Wed) → 1
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
