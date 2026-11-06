import { Inject, Injectable } from '@nestjs/common';
import { CreateCard } from '../../card-library/application/create-card';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../shared/application/transaction-runner';
import {
  DAILY_SESSION_REPOSITORY,
  QUESTION_NOTE_REPOSITORY,
} from '../daily-practice.tokens';
import type { DailySessionId, QuestionId, UserId } from '../domain/ids';
import type {
  DailySessionRepository,
  QuestionNoteRepository,
} from '../domain/repositories';
import { DailySessionNotFound } from './errors';

/**
 * DP-10, DP-32, DP-40: "Save as card" — a user action that calls Card Library's public
 * createCard (context map; no event). The card is created first (its own transaction),
 * then the question is marked saved; see ADR-013 for the rare retry case.
 * DP-49: the note, as it is now, goes on the back. DP-64: the card editor may send edited
 * text and tags; the same CARD rules apply, because Card Library checks them.
 */
@Injectable()
export class SaveQuestionAsCard {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(DAILY_SESSION_REPOSITORY)
    private readonly sessions: DailySessionRepository,
    @Inject(QUESTION_NOTE_REPOSITORY)
    private readonly notes: QuestionNoteRepository,
    private readonly createCard: CreateCard,
  ) {}

  async execute(input: {
    userId: UserId;
    sessionId: DailySessionId;
    questionId: QuestionId;
    edited?: { front?: string; back?: string; tagNames?: string[] };
  }): Promise<{ cardId: string }> {
    const session = await this.sessions.findById(input.userId, input.sessionId);
    if (!session) throw new DailySessionNotFound(input.sessionId);
    const note = await this.notes.find(input.userId, input.questionId);
    const draft = session.cardDraftFor(input.questionId, note?.text ?? null);
    const cardId = await this.createCard.execute({
      userId: input.userId,
      front: input.edited?.front ?? draft.front,
      back: input.edited?.back ?? draft.back,
      tagNames: input.edited?.tagNames ?? [draft.tagName],
    });
    await this.transactions.run(async () => {
      const fresh = await this.sessions.findById(input.userId, input.sessionId);
      fresh!.markSavedAsCard(input.questionId);
      await this.sessions.save(fresh!);
    });
    return { cardId };
  }
}
