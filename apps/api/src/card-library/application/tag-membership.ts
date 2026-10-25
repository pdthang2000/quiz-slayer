import type { EventPublisher } from '../../shared/application/event-publisher';
import type { TransactionRunner } from '../../shared/application/transaction-runner';
import type { Card } from '../domain/card';
import type { CardRepository } from '../domain/card-repository';
import { CardId, TagId, UserId } from '../domain/ids';
import type { TagRepository } from '../domain/tag-repository';
import type { CardTags } from './card-tags';
import { TagNotFound } from './errors';
import type { CardVersion, TagVersion } from './versions';

/**
 * CARDTAG-07, CARDTAG-08, ADR-011: one transaction over the tag and every listed card.
 * Each card: version check (CARD-08), then `change` (card.addTag / card.removeTag, which
 * check TRASH-02, CARDTAG-03 and treat no change as a no-op, CARDTAG-05). Only changed
 * cards are saved; the tag's version goes up if any card changed (TAG-16).
 * Any error rolls everything back.
 */
export async function changeTagMembership(
  deps: {
    transactions: TransactionRunner;
    cards: CardRepository;
    tags: TagRepository;
    events: EventPublisher;
    cardTags: CardTags;
  },
  input: {
    userId: UserId;
    tagId: TagId;
    cards: { cardId: CardId; version: number }[];
  },
  change: (card: Card, tagId: TagId) => void,
): Promise<{ tag: TagVersion; cards: CardVersion[] }> {
  const { tag, changed, cards } = await deps.transactions.run(async () => {
    const tag = await deps.tags.findById(input.userId, input.tagId);
    if (!tag) throw new TagNotFound(input.tagId);
    const changed: Card[] = [];
    const cards: CardVersion[] = [];
    for (const item of uniqueByCard(input.cards)) {
      const card = await deps.cardTags.load(input.userId, item.cardId); // TRASH-02 via the domain
      card.assertVersion(item.version);
      const had = card.hasTag(tag.id);
      change(card, tag.id);
      const isChanged = had !== card.hasTag(tag.id);
      if (isChanged) changed.push(card);
      cards.push({
        id: card.id,
        version: isChanged ? card.version + 1 : card.version,
      });
    }
    if (changed.length > 0) {
      // Same order in every transaction, so two bulk changes don't deadlock.
      await deps.cards.saveAll(
        [...changed].sort((a, b) => a.id.localeCompare(b.id)),
      );
      await deps.tags.save(tag); // TAG-16
    }
    return { tag, changed, cards };
  });
  deps.events.publish(changed.flatMap((c) => c.pullEvents()));
  return {
    tag: {
      id: tag.id,
      version: changed.length > 0 ? tag.version + 1 : tag.version,
    },
    cards,
  };
}

/** A card listed twice counts once (its first entry). */
function uniqueByCard<T extends { cardId: CardId }>(items: T[]): T[] {
  const byCard = new Map<CardId, T>();
  for (const item of items) {
    if (!byCard.has(item.cardId)) byCard.set(item.cardId, item);
  }
  return [...byCard.values()];
}
