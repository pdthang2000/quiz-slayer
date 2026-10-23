import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CARD_REPOSITORY, TAG_REPOSITORY } from '../card-library.tokens';
import { Card } from '../domain/card';
import type { CardRepository } from '../domain/card-repository';
import { TooManyTags } from '../domain/errors';
import { CardId, TagId, UserId } from '../domain/ids';
import { Tag } from '../domain/tag';
import { TagColor } from '../domain/tag-color';
import { TagName } from '../domain/tag-name';
import type { TagRepository } from '../domain/tag-repository';
import { CardNotFound } from './errors';

/** Helpers shared by the card use cases. Call inside a transaction. */
@Injectable()
export class CardTags {
  constructor(
    @Inject(TAG_REPOSITORY) private readonly tags: TagRepository,
    @Inject(CARD_REPOSITORY) private readonly cards: CardRepository,
  ) {}

  /**
   * TAG-01 names → tag ids. CARDTAG-06: duplicates (after normalization) count once.
   * TAG-05: unknown names become new tags with a random color (TAG-12).
   * Returns the ids and the tags created here (whose TagCreated events must be published).
   */
  async resolve(
    userId: UserId,
    tagNames: string[],
  ): Promise<{ tagIds: TagId[]; created: Tag[] }> {
    const names = new Map<string, TagName>();
    for (const raw of tagNames) {
      const name = TagName.create(raw);
      names.set(name.value, name);
    }
    // CARDTAG-03 before any tag is created (the transaction would roll back anyway).
    if (names.size > Card.MAX_TAGS) throw new TooManyTags(Card.MAX_TAGS);
    const tagIds: TagId[] = [];
    const created: Tag[] = [];
    for (const name of names.values()) {
      const existing = await this.tags.findByName(userId, name);
      if (existing) {
        tagIds.push(existing.id);
        continue;
      }
      const candidate = Tag.create({
        id: TagId(randomUUID()),
        userId,
        name,
        color: TagColor.random(),
      });
      const tag = await this.tags.findOrInsertByName(candidate);
      tagIds.push(tag.id);
      if (tag === candidate) created.push(candidate);
    }
    return { tagIds, created };
  }

  /**
   * Loads a card in either state, so the domain decides what is allowed
   * (e.g. editing a trashed card → CardIsTrashed, not "not found").
   */
  async load(userId: UserId, cardId: CardId): Promise<Card> {
    const card =
      (await this.cards.findActive(userId, cardId)) ??
      (await this.cards.findTrashed(userId, cardId));
    if (!card) throw new CardNotFound(cardId);
    return card;
  }
}
