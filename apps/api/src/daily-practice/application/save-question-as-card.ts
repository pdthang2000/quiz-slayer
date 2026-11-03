import { Inject, Injectable } from '@nestjs/common';
import { CreateCard } from '../../card-library/application/create-card';
import { UserId as CardUserId } from '../../card-library/domain/ids';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../shared/application/transaction-runner';
import { DAILY_SESSION_REPOSITORY } from '../daily-practice.tokens';
import type { DailySessionId, QuestionId, UserId } from '../domain/ids';
import type { DailySessionRepository } from '../domain/repositories';
import { DailySessionNotFound } from './errors';

/**
 * DP-10, DP-32, DP-40: "Save as card" — a user action that calls Card Library's public
 * createCard (context map; no event). The card is created first (its own transaction),
 * then the question is marked saved; see ADR-013 for the rare retry case.
 */
@Injectable()
export class SaveQuestionAsCard {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(DAILY_SESSION_REPOSITORY)
    private readonly sessions: DailySessionRepository,
    private readonly createCard: CreateCard,
  ) {}

  async execute(input: {
    userId: UserId;
    sessionId: DailySessionId;
    questionId: QuestionId;
  }): Promise<{ cardId: string }> {
    const session = await this.sessions.findById(input.userId, input.sessionId);
    if (!session) throw new DailySessionNotFound(input.sessionId);
    const draft = session.cardDraftFor(input.questionId);
    const cardId = await this.createCard.execute({
      userId: CardUserId(input.userId),
      front: draft.front,
      back: draft.back,
      tagNames: [draft.tagName],
    });
    await this.transactions.run(async () => {
      const fresh = await this.sessions.findById(input.userId, input.sessionId);
      fresh!.markSavedAsCard(input.questionId);
      await this.sessions.save(fresh!);
    });
    return { cardId };
  }
}
