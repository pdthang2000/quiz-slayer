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

/** TRASH-05, TRASH-09, TRASH-10 */
@Injectable()
export class DeleteCardPermanently {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(CARD_REPOSITORY) private readonly cards: CardRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
    private readonly cardTags: CardTags,
  ) {}

  async execute(input: { userId: UserId; cardId: CardId }): Promise<void> {
    const card = await this.transactions.run(async () => {
      const card = await this.cardTags.load(input.userId, input.cardId);
      card.deletePermanently();
      await this.cards.delete(card);
      return card;
    });
    this.events.publish(card.pullEvents());
  }
}
