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
import { CardBack, CardFront } from '../domain/card-text';
import { CardId, UserId } from '../domain/ids';
import { CardTags } from './card-tags';

/**
 * CARD-07: the editor's Save sends front, back and the full tag list; only what changed
 * is applied (CARD-06 for the text). ADR-009: new tags and the card in one transaction.
 */
@Injectable()
export class EditCard {
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
    front: string;
    back: string;
    tagNames: string[];
  }): Promise<void> {
    const front = CardFront.create(input.front);
    const back = CardBack.create(input.back);
    const { card, created } = await this.transactions.run(async () => {
      const card = await this.cardTags.load(input.userId, input.cardId);
      card.edit(front, back); // CardIsTrashed before any tag is created
      const { tagIds, created } = await this.cardTags.resolve(
        input.userId,
        input.tagNames,
      );
      card.setTags(tagIds);
      await this.cards.save(card);
      return { card, created };
    });
    this.events.publish([
      ...created.flatMap((t) => t.pullEvents()),
      ...card.pullEvents(),
    ]);
  }
}
