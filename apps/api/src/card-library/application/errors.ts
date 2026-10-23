import { DomainError } from '../domain/errors';
import { CardId, TagId } from '../domain/ids';

/** Application-layer errors (they need a lookup or a count). Mapped to HTTP in api/. */

export class CardNotFound extends DomainError {
  readonly code = 'CardNotFound';
  constructor(readonly cardId: CardId) {
    super(`Card ${cardId} not found`);
  }
}

export class TagNotFound extends DomainError {
  readonly code = 'TagNotFound';
  constructor(readonly tagId: TagId) {
    super(`Tag ${tagId} not found`);
  }
}

export type MergePreview = {
  into: { id: TagId; name: string };
  intoCount: number;
  fromCount: number;
  resultCount: number;
};

/** TAG-15: a rename onto an existing name needs confirmMerge. Carries the TAG-08 preview. */
export class TagMergeNeedsConfirmation extends DomainError {
  readonly code = 'TagMergeNeedsConfirmation';
  constructor(readonly preview: MergePreview) {
    super(
      `Renaming onto "${preview.into.name}" merges two tags; confirm first`,
    );
  }
}

/** TRASH-11: the Trash no longer holds the count the user confirmed. */
export class TrashChanged extends DomainError {
  readonly code = 'TrashChanged';
  constructor(
    readonly expectedCount: number,
    readonly actualCount: number,
  ) {
    super(`Trash holds ${actualCount} cards, not ${expectedCount}`);
  }
}
