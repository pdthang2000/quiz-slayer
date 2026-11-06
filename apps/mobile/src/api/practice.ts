import { getCalendars } from 'expo-localization';
import { request } from './client';
import type {
  DailySession,
  DailySessionSummary,
  QuizKind,
  Today,
  Track,
  TrackOption,
} from './types';

/** DP-05, ADR-013: the phone's timezone decides what "today" is. */
export function phoneTimeZone(): string {
  return (
    getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
  );
}

const day = () => ({ headers: { 'X-Time-Zone': phoneTimeZone() } });

// Daily Practice endpoints (apps/api/src/daily-practice/api).
export const practiceApi = {
  /** G-5: tracks, today's progress, streaks. */
  today: () => request<Today>('GET', '/practice/today', day()),

  /** DP-31 Start, DP-22 resume. */
  start: (trackId: string) =>
    request<DailySession>('POST', `/practice/tracks/${trackId}/start`, day()),

  session: (id: string) => request<DailySession>('GET', `/practice/sessions/${id}`, day()),

  /** DP-03: one choice per question of the quiz; returns the session with the feedback. */
  answer: (sessionId: string, quizId: string, choices: number[]) =>
    request<DailySession>('POST', `/practice/sessions/${sessionId}/quizzes/${quizId}/answer`, {
      ...day(),
      body: { choices },
    }),

  /** DP-10, DP-40. */
  saveAsCard: (sessionId: string, questionId: string) =>
    request<{ cardId: string }>(
      'POST',
      `/practice/sessions/${sessionId}/questions/${questionId}/save-as-card`,
    ),

  /** DP-26 */
  history: (trackId: string) =>
    request<DailySessionSummary[]>('GET', `/practice/tracks/${trackId}/history`, day()),

  /** DP-69 */
  bestStreak: (trackId: string) =>
    request<{ bestStreak: number }>('GET', `/practice/tracks/${trackId}/best-streak`),

  tracks: () => request<Track[]>('GET', '/practice/tracks'),

  /** G-2 */
  trackOptions: () => request<TrackOption[]>('GET', '/practice/track-options'),

  addTrack: (tagName: string) => request<Track>('POST', '/practice/tracks', { body: { tagName } }),

  /** DP-12, DP-13, DP-53 */
  changeTrack: (track: Track, settings: { kinds?: QuizKind[]; dailySize?: number }) =>
    request<Track>('PATCH', `/practice/tracks/${track.id}`, {
      body: settings,
      version: track.version,
    }),

  /** DP-15, DP-53 */
  removeTrack: (track: Track) =>
    request<void>('DELETE', `/practice/tracks/${track.id}`, { version: track.version }),
};
