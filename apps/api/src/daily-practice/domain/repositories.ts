import type { DailySession } from './daily-session';
import type {
  DailySessionId,
  QuestionId,
  QuizId,
  TrackId,
  UserId,
} from './ids';
import type { LocalDate } from './local-date';
import type { QuestionNote } from './question-note';
import type { QuizProgress } from './quiz-progress';
import type { Track } from './track';

// Implemented in infrastructure/ (Prisma), bound with Nest DI tokens.

export interface TrackRepository {
  findById(userId: UserId, id: TrackId): Promise<Track | null>;
  /** DP-15: a removed track is found too, so adding the tag again continues it. */
  findByTagName(userId: UserId, tagName: string): Promise<Track | null>;
  add(track: Track): Promise<void>;
  /** Bumps the version; fails with a conflict if the stored version moved. */
  save(track: Track): Promise<void>;
}

export interface DailySessionRepository {
  findById(userId: UserId, id: DailySessionId): Promise<DailySession | null>;
  /** DP-01, DP-22: today's session of a track, if started. */
  findByDay(
    userId: UserId,
    trackId: TrackId,
    day: LocalDate,
  ): Promise<DailySession | null>;
  /** DP-39: quizzes already in the user's other sets of that day. */
  quizIdsOfDay(userId: UserId, day: LocalDate): Promise<Set<QuizId>>;
  /** DP-39: serialises set building per user (ADR-013). Inside a transaction only. */
  lockUserForDay(userId: UserId): Promise<void>;
  /** DP-01: a second session for the same track and day fails (DailySessionExists). */
  add(session: DailySession): Promise<void>;
  /** Bumps the version; fails with a conflict if the stored version moved (DP-03). */
  save(session: DailySession): Promise<void>;
}

export interface QuizProgressRepository {
  find(userId: UserId, quizId: QuizId): Promise<QuizProgress | null>;
  /** DP-30, DP-28: progress of these quizzes (missing = never answered). */
  findMany(userId: UserId, quizIds: readonly QuizId[]): Promise<QuizProgress[]>;
  add(progress: QuizProgress): Promise<void>;
  save(progress: QuizProgress): Promise<void>;
}

export interface QuestionNoteRepository {
  find(userId: UserId, questionId: QuestionId): Promise<QuestionNote | null>;
  /** DP-42: only this user's notes. DP-45: the caller asks for answered questions only. */
  findMany(
    userId: UserId,
    questionIds: readonly QuestionId[],
  ): Promise<QuestionNote[]>;
  /** A second first note at the same moment fails with NoteChanged (DP-50). */
  add(note: QuestionNote): Promise<void>;
  /** Bumps the version; fails with NoteChanged if the stored version moved (DP-50). */
  save(note: QuestionNote): Promise<void>;
  /** DP-51: every user's notes on these questions. */
  deleteOfQuestions(questionIds: readonly QuestionId[]): Promise<void>;
}
