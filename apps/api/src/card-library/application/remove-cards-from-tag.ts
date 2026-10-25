import { Inject, Injectable } from '@nestjs/common';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../shared/application/event-publisher';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../shared/application/transaction-runner';
import { CARD_REPOSITORY, TAG_REPOSITORY } from '../card-library.tokens';
import type { CardRepository } from '../domain/card-repository';
import { CardId, TagId, UserId } from '../domain/ids';
import type { TagRepository } from '../domain/tag-repository';
import { CardTags } from './card-tags';
import { changeTagMembership } from './tag-membership';
import type { CardVersion, TagVersion } from './versions';

/**
 * CARDTAG-07: the tag's card list removes cards from the tag (✕ or ticked), all or nothing (ADR-011).
 * Only this tag is removed (CARDTAG-01). Each card sends the version the list showed (CARD-08).
 */
@Injectable()
export class RemoveCardsFromTag {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(CARD_REPOSITORY) private readonly cards: CardRepository,
    @Inject(TAG_REPOSITORY) private readonly tags: TagRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
    private readonly cardTags: CardTags,
  ) {}

  execute(input: {
    userId: UserId;
    tagId: TagId;
    tagVersion: number;
    cards: { cardId: CardId; version: number }[];
  }): Promise<{ tag: TagVersion; cards: CardVersion[] }> {
    const deps = {
      transactions: this.transactions,
      cards: this.cards,
      tags: this.tags,
      events: this.events,
      cardTags: this.cardTags,
    };
    return changeTagMembership(deps, input, (card, tagId) =>
      card.removeTag(tagId),
    );
  }
}
