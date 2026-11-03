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

  session: (id: string) => request<DailySession>('GET', `/practice/sessions/${id}`),

  /** DP-03: one choice per question of the quiz; returns the session with the feedback. */
  answer: (sessionId: string, quizId: string, choices: number[]) =>
    request<DailySession>('POST', `/practice/sessions/${sessionId}/quizzes/${quizId}/answer`, {
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
    request<DailySessionSummary[]>('GET', `/practice/tracks/${trackId}/history`),

  tracks: () => request<Track[]>('GET', '/practice/tracks'),

  /** G-2 */
  trackOptions: () => request<TrackOption[]>('GET', '/practice/track-options'),

  addTrack: (tagName: string) => request<Track>('POST', '/practice/tracks', { body: { tagName } }),

  /** DP-12, DP-13 */
  changeTrack: (id: string, settings: { kinds?: QuizKind[]; dailySize?: number }) =>
    request<Track>('PATCH', `/practice/tracks/${id}`, { body: settings }),

  /** DP-15 */
  removeTrack: (id: string) => request<void>('DELETE', `/practice/tracks/${id}`),
};
