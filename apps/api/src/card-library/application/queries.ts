import { Inject, Injectable } from '@nestjs/common';
import { CARD_LIBRARY_QUERIES } from '../card-library.tokens';
import {
  type CardLibraryQueries,
  CardSummary,
  Page,
  TagPickerCard,
  TagWithCount,
  TrashedCardSummary,
  TrashState,
} from './card-library-queries';
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
  }): Promise<Page<TrashedCardSummary> & TrashState> {
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

/** STUDY-01, STUDY-02: the session's card ids, taken when Study is pressed. */
@Injectable()
export class ListStudyCardIds {
  constructor(
    @Inject(CARD_LIBRARY_QUERIES) private readonly queries: CardLibraryQueries,
  ) {}

  execute(input: {
    userId: UserId;
    search?: string;
    tagIds?: TagId[];
  }): Promise<CardId[]> {
    return this.queries.listActiveCardIds(input.userId, input);
  }
}

/** STUDY-02: card content by ids, a batch at a time; trashed or deleted cards are skipped. */
@Injectable()
export class GetCardsByIds {
  constructor(
    @Inject(CARD_LIBRARY_QUERIES) private readonly queries: CardLibraryQueries,
  ) {}

  execute(input: {
    userId: UserId;
    cardIds: CardId[];
  }): Promise<CardSummary[]> {
    return this.queries.findActiveCardsByIds(input.userId, input.cardIds);
  }
}

/** CARDTAG-08: the "+ Add cards" picker. */
@Injectable()
export class ListCardsToAddToTag {
  constructor(
    @Inject(CARD_LIBRARY_QUERIES) private readonly queries: CardLibraryQueries,
  ) {}

  execute(input: {
    userId: UserId;
    tagId: TagId;
    search?: string;
    cursor?: string;
  }): Promise<Page<TagPickerCard>> {
    return this.queries.listActiveCardsWithoutTag(
      input.userId,
      input.tagId,
      input,
    );
  }
}

/** UI-14: "⋯ → Tags" — the card's tags with Active counts. A tag's cards: ListCards with that tag. */
@Injectable()
export class ListTagsOfCard {
  constructor(
    @Inject(CARD_LIBRARY_QUERIES) private readonly queries: CardLibraryQueries,
  ) {}

  async execute(input: {
    userId: UserId;
    cardId: CardId;
  }): Promise<TagWithCount[]> {
    const tags = await this.queries.listTagsOfActiveCard(
      input.userId,
      input.cardId,
    );
    if (!tags) throw new CardNotFound(input.cardId);
    return tags;
  }
}
