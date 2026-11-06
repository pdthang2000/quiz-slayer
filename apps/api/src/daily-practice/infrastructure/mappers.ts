import { Prisma, QuizKind as DbKind } from '@prisma/client';
import type {
  DailySession as DailySessionRow,
  QuestionNote as QuestionNoteRow,
  QuizProgress as QuizProgressRow,
  Track as TrackRow,
} from '@prisma/client';
import { DailySession, type QuizAnswer } from '../domain/daily-session';
import {
  DailySessionId,
  QuestionId,
  QuizId,
  TrackId,
  UserId,
} from '../domain/ids';
import { LocalDate } from '../domain/local-date';
import type { QuizKind } from '../domain/quiz-kind';
import { QuestionNote } from '../domain/question-note';
import { type MistakeStage, QuizProgress } from '../domain/quiz-progress';
import type { QuizSnapshot } from '../domain/quiz-snapshot';
import { Track } from '../domain/track';

/** Prisma's enum values are the domain's kind codes (DB names are mapped in the schema). */
const toKind = (k: DbKind): QuizKind => k;

/** A @db.Date column comes back as midnight UTC. */
export const toLocalDate = (d: Date) =>
  LocalDate.parse(d.toISOString().slice(0, 10));
export const toDbDate = (d: LocalDate) => new Date(`${d.value}T00:00:00.000Z`);

export function toTrack(row: TrackRow): Track {
  return Track.reconstitute({
    id: TrackId(row.id),
    userId: UserId(row.userId),
    tagName: row.tagName,
    kinds: row.kinds.map(toKind),
    dailySize: row.dailySize,
    state: row.state === 'Active' ? 'active' : 'removed',
    version: row.version,
  });
}

export function toTrackData(track: Track) {
  const s = track.toSnapshot();
  return {
    tagName: s.tagName,
    kinds: s.kinds,
    dailySize: s.dailySize,
    state: s.state === 'active' ? 'Active' : 'Removed',
  } satisfies Prisma.TrackUpdateInput;
}

type StoredAnswer = { quizId: string; choices: number[]; answeredAt: string };

export function toDailySession(row: DailySessionRow): DailySession {
  return DailySession.reconstitute({
    id: DailySessionId(row.id),
    userId: UserId(row.userId),
    trackId: TrackId(row.trackId),
    tagName: row.tagName,
    day: toLocalDate(row.day),
    timeZone: row.timeZone,
    startedAt: row.startedAt,
    dailySize: row.dailySize,
    // Written by toDailySessionData from the domain's own snapshot type.
    quizzes: row.quizzes as unknown as QuizSnapshot[],
    answers: (row.answers as unknown as StoredAnswer[]).map(
      (a): QuizAnswer => ({
        quizId: QuizId(a.quizId),
        choices: a.choices,
        answeredAt: new Date(a.answeredAt),
      }),
    ),
    savedAsCard: row.savedAsCard.map(QuestionId),
    finishedAt: row.finishedAt,
    version: row.version,
  });
}

export function toDailySessionData(session: DailySession) {
  const s = session.toSnapshot();
  const answers: StoredAnswer[] = s.answers.map((a) => ({
    quizId: a.quizId,
    choices: [...a.choices],
    answeredAt: a.answeredAt.toISOString(),
  }));
  return {
    answers: answers as unknown as Prisma.InputJsonValue,
    savedAsCard: s.savedAsCard,
    finishedAt: s.finishedAt,
  } satisfies Prisma.DailySessionUpdateInput;
}

export function toNewDailySessionRow(session: DailySession) {
  const s = session.toSnapshot();
  return {
    id: s.id,
    userId: s.userId,
    trackId: s.trackId,
    day: toDbDate(s.day),
    timeZone: s.timeZone,
    startedAt: s.startedAt,
    tagName: s.tagName,
    dailySize: s.dailySize,
    quizIds: s.quizzes.map((q) => q.id),
    quizzes: s.quizzes as unknown as Prisma.InputJsonValue,
    ...toDailySessionData(session),
    version: 0,
  } satisfies Prisma.DailySessionUncheckedCreateInput;
}

export function toQuestionNote(row: QuestionNoteRow): QuestionNote {
  return QuestionNote.reconstitute({
    userId: UserId(row.userId),
    questionId: QuestionId(row.questionId),
    text: row.text,
    version: row.version,
  });
}

export function toQuizProgress(row: QuizProgressRow): QuizProgress {
  return QuizProgress.reconstitute({
    userId: UserId(row.userId),
    quizId: QuizId(row.quizId),
    lastAnsweredOn: toLocalDate(row.lastAnsweredOn),
    lastAnsweredAt: row.lastAnsweredAt,
    lastSessionId: DailySessionId(row.lastSessionId),
    mistake:
      row.mistakeStage && row.mistakeDueOn
        ? {
            stage: row.mistakeStage as MistakeStage,
            dueOn: toLocalDate(row.mistakeDueOn),
          }
        : null,
    version: row.version,
  });
}

export function toQuizProgressData(progress: QuizProgress) {
  const s = progress.toSnapshot();
  return {
    lastAnsweredOn: toDbDate(s.lastAnsweredOn),
    lastAnsweredAt: s.lastAnsweredAt,
    lastSessionId: s.lastSessionId,
    mistakeStage: s.mistake?.stage ?? null,
    mistakeDueOn: s.mistake ? toDbDate(s.mistake.dueOn) : null,
  } satisfies Prisma.QuizProgressUpdateInput;
}
