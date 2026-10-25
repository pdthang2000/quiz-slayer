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
  /** null: the target was renamed and nobody holds the name now (C-38). */
  into: { id: TagId; name: string } | null;
  intoCount: number;
  fromCount: number;
  resultCount: number;
};

/** TAG-15: a rename onto an existing name needs confirmMerge. Carries the TAG-08 preview. */
export class TagMergeNeedsConfirmation extends DomainError {
  readonly code = 'TagMergeNeedsConfirmation';
  constructor(readonly preview: MergePreview) {
    super(
      preview.into
        ? `Renaming onto "${preview.into.name}" merges two tags; confirm first`
        : 'The merge target changed; check again',
    );
  }
}

/**
 * C-40: a confirmed merge was rolled back because one of its cards was saved on another
 * device at the same moment (CARD-08). A retry almost always works.
 */
export class TagMergeFailed extends DomainError {
  readonly code = 'TagMergeFailed';
  constructor(
    readonly tagId: TagId,
    readonly intoTagId: TagId,
  ) {
    super('Merge failed, try again');
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
