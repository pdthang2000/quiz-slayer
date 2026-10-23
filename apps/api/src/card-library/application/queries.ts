import { Inject, Injectable } from '@nestjs/common';
import { CARD_LIBRARY_QUERIES } from '../card-library.tokens';
import {
  type CardLibraryQueries,
  CardSummary,
  Page,
  TagWithCount,
  TrashedCardSummary,
} from '../domain/card-library-queries';
import { CardId, TagId, UserId } from '../domain/ids';
import { CardNotFound } from './errors';

// One class per query (CLAUDE.md). Reads go straight to the read port.

/** READ-01, READ-02, READ-03, READ-05 */
@Injectable()
export class ListCards {
  constructor(
    @Inject(CARD_LIBRARY_QUERIES) private readonly queries: CardLibraryQueries,
  ) {}

  execute(input: {
    userId: UserId;
    search?: string;
    tagIds?: TagId[];
    cursor?: string;
  }): Promise<Page<CardSummary>> {
    return this.queries.listActiveCards(input.userId, input);
  }
}

/** READ-01: card detail is Active only; a trashed card is "not found" here. */
@Injectable()
export class GetCard {
  constructor(
    @Inject(CARD_LIBRARY_QUERIES) private readonly queries: CardLibraryQueries,
  ) {}

  async execute(input: {
    userId: UserId;
    cardId: CardId;
  }): Promise<CardSummary> {
    const card = await this.queries.findActiveCard(input.userId, input.cardId);
    if (!card) throw new CardNotFound(input.cardId);
    return card;
  }
}

/** TRASH-07, TRASH-12 */
@Injectable()
export class ListTrash {
  constructor(
    @Inject(CARD_LIBRARY_QUERIES) private readonly queries: CardLibraryQueries,
  ) {}

  execute(input: {
    userId: UserId;
    cursor?: string;
  }): Promise<Page<TrashedCardSummary> & { total: number }> {
    return this.queries.listTrashedCards(input.userId, input.cursor);
  }
}

/** READ-04, UI-02, UI-03 */
@Injectable()
export class ListTags {
  constructor(
    @Inject(CARD_LIBRARY_QUERIES) private readonly queries: CardLibraryQueries,
  ) {}

  execute(input: { userId: UserId }): Promise<TagWithCount[]> {
    return this.queries.listTagsWithActiveCounts(input.userId);
  }
}
