import type { DailySession } from '../domain/daily-session';
import type { TrackId, UserId } from '../domain/ids';
import type { LocalDate } from '../domain/local-date';
import type { Track } from '../domain/track';

// Read port for screens. Infrastructure implements it; it is the only part of
// application/ that infrastructure may import (CLAUDE.md).

export type FinishedDay = { trackId: TrackId; day: string };

export interface DailyPracticeQueries {
  /** DP-09: the user's Active tracks, in the order they were added. */
  listActiveTracks(userId: UserId): Promise<Track[]>;
  /** DP-19, DP-23: every day each track's set was finished (streaks, ADR-013). */
  finishedDays(userId: UserId): Promise<FinishedDay[]>;
  /** The user's sessions of one day (today overview). */
  sessionsOn(userId: UserId, day: LocalDate): Promise<DailySession[]>;
  /** DP-26: a track's sessions, newest day first. */
  history(userId: UserId, trackId: TrackId): Promise<DailySession[]>;
}
