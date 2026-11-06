import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  GetQuizzesForPractice,
  ListPoolQuizIds,
} from '../../question-bank/application/queries';
import { CLOCK, type Clock } from '../../shared/application/clock';
import { OUTBOX, type Outbox } from '../../shared/application/outbox';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../shared/application/transaction-runner';
import {
  DAILY_SESSION_REPOSITORY,
  QUIZ_PROGRESS_REPOSITORY,
  TRACK_REPOSITORY,
} from '../daily-practice.tokens';
import { DailySession } from '../domain/daily-session';
import { buildDailySet } from '../domain/daily-set';
import { TrackIsRemoved } from '../domain/errors';
import {
  DailySessionId,
  QuestionId,
  QuizId,
  type TrackId,
  type UserId,
} from '../domain/ids';
import { checkTimeZone, LocalDate } from '../domain/local-date';
import type { QuizSnapshot } from '../domain/quiz-snapshot';
import type {
  DailySessionRepository,
  QuizProgressRepository,
  TrackRepository,
} from '../domain/repositories';
import { TrackNotFound } from './errors';
import { toSessionView, type DailySessionView } from './views';

/**
 * DP-31: today's set is chosen when the user taps Start. DP-22: today's set exists → resume.
 * DP-05: today = the phone's calendar day. Steps: daily-practice.md "How a day's set is built".
 */
@Injectable()
export class StartDailySession {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepository,
    @Inject(DAILY_SESSION_REPOSITORY)
    private readonly sessions: DailySessionRepository,
    @Inject(QUIZ_PROGRESS_REPOSITORY)
    private readonly progress: QuizProgressRepository,
    @Inject(OUTBOX) private readonly outbox: Outbox,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly pool: ListPoolQuizIds,
    private readonly quizzes: GetQuizzesForPractice,
  ) {}

  async execute(input: {
    userId: UserId;
    trackId: TrackId;
    timeZone: string | undefined;
  }): Promise<DailySessionView> {
    const timeZone = checkTimeZone(input.timeZone);
    const now = this.clock.now();
    const today = LocalDate.of(now, timeZone);
    const time = { now, timeZone };
    return this.transactions.run(async () => {
      const track = await this.tracks.findById(input.userId, input.trackId);
      if (!track) throw new TrackNotFound(input.trackId);

      const existing = await this.sessions.findByDay(
        input.userId,
        track.id,
        today,
      );
      if (existing) return toSessionView(existing, time); // DP-22
      if (!track.isActive) throw new TrackIsRemoved(); // DP-15

      // DP-39: one set is built at a time per user, so two tracks can't pick the same quiz.
      await this.sessions.lockUserForDay(input.userId);
      const raced = await this.sessions.findByDay(
        input.userId,
        track.id,
        today,
      );
      if (raced) return toSessionView(raced, time);

      // 1. Pool: the track's tag, allowed kinds, System + own (DP-11, DP-12, QB-10).
      const poolIds = (
        await this.pool.execute({
          userId: input.userId,
          tagName: track.tagName,
          kinds: track.kinds,
        })
      ).map((id) => QuizId(id));
      const progress = new Map(
        (await this.progress.findMany(input.userId, poolIds)).map((p) => [
          p.quizId,
          p,
        ]),
      );
      // 2–6 (DP-30, DP-34, DP-35, DP-28, DP-14), minus today's other sets (DP-39).
      const set = buildDailySet({
        pool: poolIds.map((quizId) => {
          const p = progress.get(quizId);
          return {
            quizId,
            progress: p && {
              lastAnsweredAt: p.lastAnsweredAt,
              mistake: p.mistake,
            },
          };
        }),
        excluded: await this.sessions.quizIdsOfDay(input.userId, today),
        dailySize: track.dailySize,
        today,
      });

      // 7. Save the chosen quizzes as today's set, with their content (QB-04).
      const content = await this.quizzes.execute({
        userId: input.userId,
        quizIds: set.quizIds,
      });
      const snapshots: QuizSnapshot[] = content.map((q) => ({
        id: QuizId(q.id),
        kind: q.kind,
        passage: q.passage,
        audioUrl: q.audioUrl,
        questions: q.questions.map((x) => ({ ...x, id: QuestionId(x.id) })),
      }));
      const session = DailySession.start({
        id: DailySessionId(randomUUID()),
        userId: input.userId,
        trackId: track.id,
        tagName: track.tagName,
        day: today,
        timeZone,
        startedAt: now,
        dailySize: track.dailySize,
        quizzes: snapshots,
      });
      await this.sessions.add(session);
      await this.outbox.add(session.pullEvents());
      return toSessionView(session, time);
    });
  }
}
