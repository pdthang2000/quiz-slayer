// A study session's order and position (STUDY-02, STUDY-03, STUDY-09, STUDY-11).
// Pure functions over plain data so the rules can be tested without a screen.
// Nothing here is stored (STUDY-05): the session lives only while the screen is open.

export type StudySession = {
  /** The session's card ids in study order; ids of cards found trashed/deleted are removed. */
  order: string[];
  /** Index into `order` of the card on screen; `order.length` means the "Done!" screen. */
  position: number;
};

export type Random = () => number;

/** Fisher–Yates over a copy. */
export function shuffled<T>(items: readonly T[], random: Random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** STUDY-03: newest first by default, as the server sends the ids. */
export function startSession(ids: readonly string[]): StudySession {
  return { order: [...ids], position: 0 };
}

export const isDone = (s: StudySession) => s.position >= s.order.length;

/** STUDY-08: Next; after the last card comes the "Done!" screen (STUDY-11). */
export function next(s: StudySession): StudySession {
  return isDone(s) ? s : { ...s, position: s.position + 1 };
}

/** STUDY-08: Prev; stays on the first card. */
export function prev(s: StudySession): StudySession {
  return s.position === 0 ? s : { ...s, position: s.position - 1 };
}

/**
 * STUDY-09: shuffle only the cards not seen yet; the position stays.
 * Seen = every card up to and including the one on screen. On the very first card
 * (nothing moved yet) the whole session is shuffled (STUDY-03; provisional, see open-questions).
 */
export function shuffleUnseen(s: StudySession, random: Random = Math.random): StudySession {
  if (s.position === 0) return { order: shuffled(s.order, random), position: 0 };
  const seen = s.order.slice(0, s.position + 1);
  return { order: [...seen, ...shuffled(s.order.slice(s.position + 1), random)], position: s.position };
}

/**
 * STUDY-02, STUDY-12: cards found trashed or deleted when their batch was fetched are
 * skipped. Only ids at or after the position are ever fetched for the first time, so the
 * card on screen keeps its place.
 */
export function skipMissing(s: StudySession, missing: ReadonlySet<string>): StudySession {
  if (missing.size === 0) return s;
  const before = s.order.slice(0, s.position).filter((id) => !missing.has(id));
  const after = s.order.slice(s.position).filter((id) => !missing.has(id));
  return { order: [...before, ...after], position: before.length };
}

/** STUDY-11: "Study again" (default order) and "Shuffle & again" over the same cards. */
export function again(ids: readonly string[], shuffle: boolean, random: Random = Math.random) {
  return startSession(shuffle ? shuffled(ids, random) : ids);
}

/** Content is fetched 20 at a time (card-library.md → How a session loads). */
export const BATCH_SIZE = 20;
/** Fetch the next batch when fewer than this many fetched cards are left ahead. */
export const PREFETCH_AHEAD = 5;

/**
 * The next ids to fetch: up to BATCH_SIZE not-yet-fetched ids from the position on, once
 * fewer than PREFETCH_AHEAD fetched cards are left ahead. Empty = nothing to fetch now.
 */
export function idsToFetch(s: StudySession, fetched: ReadonlySet<string>): string[] {
  const ahead = s.order.slice(s.position);
  const firstUnfetched = ahead.findIndex((id) => !fetched.has(id));
  if (firstUnfetched === -1 || firstUnfetched >= PREFETCH_AHEAD) return [];
  return ahead.filter((id) => !fetched.has(id)).slice(0, BATCH_SIZE);
}

/** A horizontal move longer than this is a swipe (STUDY-08). */
export const SWIPE_DISTANCE = 50;

/** STUDY-08: swipe left = next, swipe right = previous; a short move does nothing. */
export function swipeMove(dx: number): typeof next | typeof prev | null {
  if (dx <= -SWIPE_DISTANCE) return next;
  if (dx >= SWIPE_DISTANCE) return prev;
  return null;
}
