import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { DailySession } from '../domain/daily-session';
import {
  DailySessionExists,
  NoteChanged,
  PracticeChanged,
  TrackChanged,
} from '../domain/errors';
import {
  type DailySessionId,
  type QuestionId,
  QuizId,
  type TrackId,
  type UserId,
} from '../domain/ids';
import type { LocalDate } from '../domain/local-date';
import type { QuestionNote } from '../domain/question-note';
import type { QuizProgress } from '../domain/quiz-progress';
import type {
  DailySessionRepository,
  QuestionNoteRepository,
  QuizProgressRepository,
  TrackRepository,
} from '../domain/repositories';
import type { Track } from '../domain/track';
import {
  toDailySession,
  toDailySessionData,
  toDbDate,
  toNewDailySessionRow,
  toQuestionNote,
  toQuizProgress,
  toQuizProgressData,
  toTrack,
  toTrackData,
} from './mappers';

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

@Injectable()
export class PrismaTrackRepository implements TrackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: UserId, id: TrackId): Promise<Track | null> {
    const row = await this.prisma.db.track.findFirst({ where: { id, userId } });
    return row ? toTrack(row) : null;
  }

  async findByTagName(userId: UserId, tagName: string): Promise<Track | null> {
    const row = await this.prisma.db.track.findUnique({
      where: { userId_tagName: { userId, tagName } },
    });
    return row ? toTrack(row) : null;
  }

  async add(track: Track): Promise<void> {
    try {
      await this.prisma.db.track.create({
        data: {
          id: track.id,
          userId: track.userId,
          ...toTrackData(track),
          version: 0,
        },
      });
    } catch (e) {
      // Two "add" taps at once for the same tag (DP-09): the later one reloads.
      if (isUniqueViolation(e)) throw new PracticeChanged('track');
      throw e;
    }
  }

  async save(track: Track): Promise<void> {
    const { count } = await this.prisma.db.track.updateMany({
      where: { id: track.id, userId: track.userId, version: track.version },
      data: { ...toTrackData(track), version: { increment: 1 } },
    });
    if (count === 0) throw new TrackChanged(); // DP-53: changed since it was loaded
  }
}

@Injectable()
export class PrismaDailySessionRepository implements DailySessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    userId: UserId,
    id: DailySessionId,
  ): Promise<DailySession | null> {
    const row = await this.prisma.db.dailySession.findFirst({
      where: { id, userId },
    });
    return row ? toDailySession(row) : null;
  }

  async findByDay(
    userId: UserId,
    trackId: TrackId,
    day: LocalDate,
  ): Promise<DailySession | null> {
    const row = await this.prisma.db.dailySession.findUnique({
      where: { userId_trackId_day: { userId, trackId, day: toDbDate(day) } },
    });
    return row ? toDailySession(row) : null;
  }

  async quizIdsOfDay(userId: UserId, day: LocalDate): Promise<Set<QuizId>> {
    const rows = await this.prisma.db.dailySession.findMany({
      where: { userId, day: toDbDate(day) },
      select: { quizIds: true },
    });
    return new Set(rows.flatMap((r) => r.quizIds.map(QuizId)));
  }

  /** DP-39, ADR-013: a per-user lock held until the transaction ends. Raw SQL for locking only. */
  async lockUserForDay(userId: UserId): Promise<void> {
    if (!this.prisma.inTransaction) {
      throw new Error('lockUserForDay must run inside a transaction');
    }
    await this.prisma.db
      .$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`daily-set:${userId}`}))::text`;
  }

  async add(session: DailySession): Promise<void> {
    try {
      await this.prisma.db.dailySession.create({
        data: toNewDailySessionRow(session),
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new DailySessionExists();
      throw e;
    }
  }

  async save(session: DailySession): Promise<void> {
    const { count } = await this.prisma.db.dailySession.updateMany({
      where: {
        id: session.id,
        userId: session.userId,
        version: session.version,
      },
      data: { ...toDailySessionData(session), version: { increment: 1 } },
    });
    if (count === 0) throw new PracticeChanged('session');
  }
}

@Injectable()
export class PrismaQuizProgressRepository implements QuizProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(userId: UserId, quizId: QuizId): Promise<QuizProgress | null> {
    const row = await this.prisma.db.quizProgress.findUnique({
      where: { userId_quizId: { userId, quizId } },
    });
    return row ? toQuizProgress(row) : null;
  }

  async findMany(
    userId: UserId,
    quizIds: readonly QuizId[],
  ): Promise<QuizProgress[]> {
    if (quizIds.length === 0) return [];
    const rows = await this.prisma.db.quizProgress.findMany({
      where: { userId, quizId: { in: [...quizIds] } },
    });
    return rows.map(toQuizProgress);
  }

  async add(progress: QuizProgress): Promise<void> {
    try {
      await this.prisma.db.quizProgress.create({
        data: {
          userId: progress.userId,
          quizId: progress.quizId,
          ...toQuizProgressData(progress),
          version: 0,
        },
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new PracticeChanged('progress');
      throw e;
    }
  }

  async save(progress: QuizProgress): Promise<void> {
    const { count } = await this.prisma.db.quizProgress.updateMany({
      where: {
        userId: progress.userId,
        quizId: progress.quizId,
        version: progress.version,
      },
      data: { ...toQuizProgressData(progress), version: { increment: 1 } },
    });
    if (count === 0) throw new PracticeChanged('progress');
  }
}

@Injectable()
export class PrismaQuestionNoteRepository implements QuestionNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(
    userId: UserId,
    questionId: QuestionId,
  ): Promise<QuestionNote | null> {
    const row = await this.prisma.db.questionNote.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });
    return row ? toQuestionNote(row) : null;
  }

  async findMany(
    userId: UserId,
    questionIds: readonly QuestionId[],
  ): Promise<QuestionNote[]> {
    if (questionIds.length === 0) return [];
    const rows = await this.prisma.db.questionNote.findMany({
      where: { userId, questionId: { in: [...questionIds] } },
    });
    return rows.map(toQuestionNote);
  }

  async add(note: QuestionNote): Promise<void> {
    const { userId, questionId, text } = note.toSnapshot();
    try {
      await this.prisma.db.questionNote.create({
        data: { userId, questionId, text, version: 1 },
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new NoteChanged();
      throw e;
    }
  }

  async save(note: QuestionNote): Promise<void> {
    const { userId, questionId, text, version } = note.toSnapshot();
    const { count } = await this.prisma.db.questionNote.updateMany({
      where: { userId, questionId, version },
      data: { text, version: { increment: 1 } },
    });
    if (count === 0) throw new NoteChanged();
  }

  async deleteOfQuestions(questionIds: readonly QuestionId[]): Promise<void> {
    await this.prisma.db.questionNote.deleteMany({
      where: { questionId: { in: [...questionIds] } },
    });
  }
}
