import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../shared/application/clock';
import { OUTBOX, type Outbox } from '../../shared/application/outbox';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../shared/application/transaction-runner';
import { DAILY_SESSION_REPOSITORY } from '../daily-practice.tokens';
import type { QuizFeedback } from '../domain/daily-session';
import type { DailySessionId, QuizId, UserId } from '../domain/ids';
import type { DailySessionRepository } from '../domain/repositories';
import { DailySessionNotFound } from './errors';

/**
 * DP-03, DP-20, DP-21, DP-23, DP-29: answers one quiz of a session (a whole group at once,
 * G-7). The session and its events (QuizAnswered → QuizProgress) commit together (B-10).
 * DP-33, DP-52: `timeZone` (X-Time-Zone) decides the day of the answer.
 */
@Injectable()
export class AnswerQuiz {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(DAILY_SESSION_REPOSITORY)
    private readonly sessions: DailySessionRepository,
    @Inject(OUTBOX) private readonly outbox: Outbox,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: {
    userId: UserId;
    sessionId: DailySessionId;
    quizId: QuizId;
    choices: number[];
    timeZone?: string;
  }): Promise<QuizFeedback> {
    const feedback = await this.transactions.run(async () => {
      const session = await this.sessions.findById(
        input.userId,
        input.sessionId,
      );
      if (!session) throw new DailySessionNotFound(input.sessionId);
      const result = session.answerQuiz(
        input.quizId,
        input.choices,
        this.clock.now(),
        input.timeZone,
      );
      await this.sessions.save(session);
      await this.outbox.add(session.pullEvents());
      return result;
    });
    this.outbox.deliverSoon();
    return feedback;
  }
}
