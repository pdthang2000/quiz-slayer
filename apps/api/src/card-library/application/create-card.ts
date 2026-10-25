import { randomUUID } from 'node:crypto';
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
import { Card } from '../domain/card';
import type { CardRepository } from '../domain/card-repository';
import { CardBack, CardFront } from '../domain/card-text';
import { CardId, UserId } from '../domain/ids';
import { CardTags } from './card-tags';

/** TAG-05: unknown tag names are created. ADR-009: tags and card in one transaction. */
@Injectable()
export class CreateCard {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(CARD_REPOSITORY) private readonly cards: CardRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
    private readonly cardTags: CardTags,
  ) {}

  async execute(input: {
    userId: UserId;
    front: string;
    back: string;
    tagNames: string[];
  }): Promise<CardId> {
    const front = CardFront.create(input.front);
    const back = CardBack.create(input.back);
    const { card, created } = await this.transactions.run(async () => {
      const { tagIds, created } = await this.cardTags.resolve(
        input.userId,
        input.tagNames,
      );
      const card = Card.create({
        id: CardId(randomUUID()),
        userId: input.userId,
        front,
        back,
        tagIds,
      });
      await this.cards.add(card);
      return { card, created };
    });
    this.events.publish([
      ...created.flatMap((t) => t.pullEvents()),
      ...card.pullEvents(),
    ]);
    return card.id;
  }
}
