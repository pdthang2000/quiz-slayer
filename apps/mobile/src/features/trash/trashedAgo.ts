const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * TRASH-13: "Trashed 2 days ago" from the card's trashedAt (UTC from the API). A difference of
 * two instants does not depend on the time zone, so no local-time conversion is needed.
 * A trashedAt slightly in the future (phone clock behind the server) counts as "just now".
 */
export function trashedAgo(t: Translate, trashedAt: string, now: number = Date.now()): string {
  const ms = Math.max(0, now - Date.parse(trashedAt));
  if (ms < MINUTE) return t('trash.ago.justNow');
  if (ms < HOUR) return t('trash.ago.minutes', { count: Math.floor(ms / MINUTE) });
  if (ms < DAY) return t('trash.ago.hours', { count: Math.floor(ms / HOUR) });
  return t('trash.ago.days', { count: Math.floor(ms / DAY) });
}
