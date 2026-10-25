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
import type { CardLibraryQueries } from './card-library-queries';
import type { CardRepository } from '../domain/card-repository';
import { TagId, UserId } from '../domain/ids';
import { Tag } from '../domain/tag';
import { TagName } from '../domain/tag-name';
import type { TagRepository } from '../domain/tag-repository';
import { CardChanged } from '../domain/errors';
import {
  MergePreview,
  TagMergeFailed,
  TagMergeNeedsConfirmation,
  TagNotFound,
} from './errors';
import type { TagVersion } from './versions';

/**
 * TAG-16: `version` = the one the screen showed; checked first (TagChanged).
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

  /** Returns the tag that carries the name afterwards (the target after a merge) and its version. */
  async execute(input: {
    userId: UserId;
    tagId: TagId;
    version: number;
    name: string;
    confirmMerge?: boolean;
  }): Promise<TagVersion> {
    const name = TagName.create(input.name);
    const tag = await this.tags.findById(input.userId, input.tagId);
    if (!tag) throw new TagNotFound(input.tagId);
    tag.assertVersion(input.version);

    const into = await this.tags.findByName(input.userId, name);
    if (!into || into.id === tag.id) {
      // TAG-14: same name → no-op, no event, nothing written.
      if (tag.name.equals(name)) return { id: tag.id, version: tag.version };
      tag.rename(name);
      await this.tags.save(tag); // TAG-03 race → TagNameTaken; TAG-16 race → TagChanged
      this.events.publish(tag.pullEvents());
      return { id: tag.id, version: tag.version + 1 };
    }

    if (!input.confirmMerge) {
      throw new TagMergeNeedsConfirmation(await this.preview(tag, into));
    }
    return this.merge(input.userId, tag.id, input.version, into.id, name);
  }

  /** TAG-15: Active cards only (TRASH-03). `into` null → no merge target (C-38). */
  private async preview(from: Tag, into: Tag | null): Promise<MergePreview> {
    const userId = from.userId;
    const ids = into ? [from.id, into.id] : [from.id];
    const [intoCount, fromCount, resultCount] = await Promise.all([
      into ? this.queries.countActiveCardsWithAnyTag(userId, [into.id]) : 0,
      this.queries.countActiveCardsWithAnyTag(userId, [from.id]),
      this.queries.countActiveCardsWithAnyTag(userId, ids),
    ]);
    return {
      into: into ? { id: into.id, name: into.name.value } : null,
      intoCount,
      fromCount,
      resultCount,
    };
  }

  /**
   * TAG-10 as written in card-library.md. Both tags are reloaded after the lock,
   * because they may have changed since the preview. TAG-15 (C-38, revised): only an
   * unchanged target (same tag, same name) merges; anything else asks again.
   */
  private async merge(
    userId: UserId,
    fromId: TagId,
    fromVersion: number,
    intoId: TagId,
    name: TagName,
  ): Promise<TagVersion> {
    const { result, events } = await this.transactions.run(async () => {
      await this.tags.lockForMerge(userId, [fromId, intoId]);
      const from = await this.tags.findById(userId, fromId);
      if (!from) throw new TagNotFound(fromId);
      from.assertVersion(fromVersion); // TAG-16
      const into = await this.tags.findById(userId, intoId);

      if (into && into.name.equals(name)) {
        const affected = await this.cards.findByTag(userId, from.id); // TAG-09
        for (const card of affected) card.replaceTagForMerge(from.id, into.id);
        try {
          await this.cards.saveAll(affected);
        } catch (error) {
          // C-40: a card was saved meanwhile; the whole merge rolls back.
          if (error instanceof CardChanged) {
            throw new TagMergeFailed(from.id, into.id);
          }
          throw error;
        }
        from.mergeInto(into); // TagsMerged (C-17)
        await this.tags.delete(from);
        await this.tags.save(into); // TAG-16: the merge changes the target's version
        return {
          result: { id: into.id, version: into.version + 1 },
          events: from.pullEvents(),
        };
      }
      const holder = await this.holderOf(userId, name, from);
      throw new TagMergeNeedsConfirmation(await this.preview(from, holder));
    });
    this.events.publish(events);
    return result;
  }

  /** The tag that holds `name` now, other than `from` itself. */
  private async holderOf(
    userId: UserId,
    name: TagName,
    from: Tag,
  ): Promise<Tag | null> {
    const holder = await this.tags.findByName(userId, name);
    return holder && holder.id !== from.id ? holder : null;
  }
}
