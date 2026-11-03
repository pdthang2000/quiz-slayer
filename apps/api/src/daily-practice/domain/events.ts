import type { DailySessionId, QuizId, TrackId, UserId } from './ids';
import type { QuizKind } from './quiz-kind';

// ADR-013. Names are draft until Jackkie confirms them (glossary).

export type TrackAdded = {
  readonly type: 'TrackAdded';
  readonly trackId: TrackId;
  readonly userId: UserId;
  readonly tagName: string;
};
export type TrackRemoved = {
  readonly type: 'TrackRemoved';
  readonly trackId: TrackId;
  readonly userId: UserId;
};
export type TrackSettingsChanged = {
  readonly type: 'TrackSettingsChanged';
  readonly trackId: TrackId;
  readonly userId: UserId;
  readonly kinds: readonly QuizKind[];
  readonly dailySize: number;
};
export type TrackEvent = TrackAdded | TrackRemoved | TrackSettingsChanged;

export type DailySessionStarted = {
  readonly type: 'DailySessionStarted';
  readonly sessionId: DailySessionId;
  readonly userId: UserId;
  readonly trackId: TrackId;
  readonly day: string;
  readonly quizCount: number;
};
/** DP-29, DP-33, DP-37: QuizProgress reacts to it (through the outbox, B-10). */
export type QuizAnswered = {
  readonly type: 'QuizAnswered';
  readonly sessionId: DailySessionId;
  readonly userId: UserId;
  readonly quizId: QuizId;
  /** DP-33: the schedule counts from the day of the answer (DP-05). */
  readonly day: string;
  /** UTC ISO time; DP-28 uses it for "oldest answered first". */
  readonly answeredAt: string;
  /** DP-29: false if any question of a group was wrong. */
  readonly correct: boolean;
};
/** DP-23: every quiz answered. */
export type DailySessionFinished = {
  readonly type: 'DailySessionFinished';
  readonly sessionId: DailySessionId;
  readonly userId: UserId;
  readonly trackId: TrackId;
  readonly day: string;
};
export type DailySessionEvent =
  DailySessionStarted | QuizAnswered | DailySessionFinished;
