import { Inject, Injectable } from '@nestjs/common';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../shared/application/event-publisher';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../shared/application/transaction-runner';
import {
  CARD_LIBRARY_QUERIES,
  CARD_REPOSITORY,
  TAG_REPOSITORY,
} from '../card-library.tokens';
import type { CardLibraryQueries } from '../domain/card-library-queries';
import type { CardRepository } from '../domain/card-repository';
import { TagId, UserId } from '../domain/ids';
import { Tag } from '../domain/tag';
import { TagName } from '../domain/tag-name';
import type { TagRepository } from '../domain/tag-repository';
import { TagMergeNeedsConfirmation, TagNotFound } from './errors';

/**
 * TAG-11 rename, TAG-14 same name → no-op. An existing name means a merge
 * (TAG-08): never silent (TAG-15), then one transaction (TAG-10, ADR-004).
 */
@Injectable()
export class RenameTag {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(TAG_REPOSITORY) private readonly tags: TagRepository,
    @Inject(CARD_REPOSITORY) private readonly cards: CardRepository,
    @Inject(CARD_LIBRARY_QUERIES) private readonly queries: CardLibraryQueries,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  /** Returns the tag that carries the name afterwards (the target after a merge). */
  async execute(input: {
    userId: UserId;
    tagId: TagId;
    name: string;
    confirmMerge?: boolean;
  }): Promise<TagId> {
    const name = TagName.create(input.name);
    const tag = await this.tags.findById(input.userId, input.tagId);
    if (!tag) throw new TagNotFound(input.tagId);

    const into = await this.tags.findByName(input.userId, name);
    if (!into || into.id === tag.id) {
      tag.rename(name); // TAG-14: same name → no-op, no event
      await this.tags.save(tag); // TAG-03 race → TagNameTaken
      this.events.publish(tag.pullEvents());
      return tag.id;
    }

    if (!input.confirmMerge) {
      throw new TagMergeNeedsConfirmation(await this.preview(tag, into));
    }
    await this.merge(input.userId, tag, into);
    return into.id;
  }

  /** TAG-15: Active cards only (TRASH-03). */
  private async preview(from: Tag, into: Tag) {
    const userId = from.userId;
    const [intoCount, fromCount, resultCount] = await Promise.all([
      this.queries.countActiveCardsWithAnyTag(userId, [into.id]),
      this.queries.countActiveCardsWithAnyTag(userId, [from.id]),
      this.queries.countActiveCardsWithAnyTag(userId, [from.id, into.id]),
    ]);
    return {
      into: { id: into.id, name: into.name.value },
      intoCount,
      fromCount,
      resultCount,
    };
  }

  /** TAG-10 as written in card-library.md. */
  private async merge(userId: UserId, from: Tag, into: Tag): Promise<void> {
    await this.transactions.run(async () => {
      await this.tags.lockForMerge(userId, [from.id, into.id]);
      const affected = await this.cards.findByTag(userId, from.id); // TAG-09
      for (const card of affected) card.replaceTagForMerge(from.id, into.id);
      await this.cards.saveAll(affected);
      from.mergeInto(into); // TagsMerged (C-17)
      await this.tags.delete(from);
    });
    this.events.publish(from.pullEvents());
  }
}
