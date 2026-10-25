import { Inject, Injectable } from '@nestjs/common';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../shared/application/event-publisher';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../shared/application/transaction-runner';
import { CARD_REPOSITORY } from '../card-library.tokens';
import type { Card } from '../domain/card';
import type { CardRepository } from '../domain/card-repository';
import { UserId } from '../domain/ids';
import { TrashChanged } from './errors';

/**
 * TRASH-07, TRASH-11. ADR-010: the check and every delete in one transaction.
 * The screen sends the count and the newest "trashed at" it showed (null: empty Trash).
 */
@Injectable()
export class EmptyTrash {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(CARD_REPOSITORY) private readonly cards: CardRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(input: {
    userId: UserId;
    expectedCount: number;
    newestTrashedAt: Date | null;
  }): Promise<void> {
    const trashed = await this.transactions.run(async () => {
      const trashed = await this.cards.listTrashed(input.userId);
      const newest = newestTrashedAt(trashed);
      const shown = input.newestTrashedAt?.getTime() ?? -Infinity;
      if (
        trashed.length !== input.expectedCount ||
        (newest?.getTime() ?? -Infinity) > shown
      ) {
        throw new TrashChanged(
          input.expectedCount,
          trashed.length,
          input.newestTrashedAt,
          newest,
        );
      }
      for (const card of trashed) card.deletePermanently();
      await this.cards.deleteAll(trashed);
      return trashed;
    });
    this.events.publish(trashed.flatMap((c) => c.pullEvents()));
  }
}

function newestTrashedAt(cards: Card[]): Date | null {
  let newest: Date | null = null;
  for (const card of cards) {
    if (card.trashedAt && (!newest || card.trashedAt > newest)) {
      newest = card.trashedAt;
    }
  }
  return newest;
}
