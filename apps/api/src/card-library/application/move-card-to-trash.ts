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
import type { CardRepository } from '../domain/card-repository';
import { CardId, UserId } from '../domain/ids';
import { CardTags } from './card-tags';

/** TRASH-01, TRASH-10, TRASH-12. CARD-08: `version` = the one the screen showed. Returns the new version. */
@Injectable()
export class MoveCardToTrash {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(CARD_REPOSITORY) private readonly cards: CardRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
    private readonly cardTags: CardTags,
  ) {}

  async execute(input: {
    userId: UserId;
    cardId: CardId;
    version: number;
  }): Promise<{ version: number }> {
    const card = await this.transactions.run(async () => {
      const card = await this.cardTags.load(input.userId, input.cardId);
      card.assertVersion(input.version);
      card.moveToTrash(new Date());
      await this.cards.save(card);
      return card;
    });
    this.events.publish(card.pullEvents());
    return { version: card.version + 1 };
  }
}
