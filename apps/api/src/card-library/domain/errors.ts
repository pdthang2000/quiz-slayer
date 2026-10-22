import { CardId, TagId } from './ids';

/** Base for every Card Library rule violation. The api/ layer maps these to HTTP. */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** CARD-01, CARD-02 */
export class InvalidCardFront extends DomainError {
  readonly code = 'InvalidCardFront';
  constructor(readonly reason: 'empty' | 'tooLong') {
    super(`Card front is invalid: ${reason}`);
  }
}

/** CARD-01, CARD-02 */
export class InvalidCardBack extends DomainError {
  readonly code = 'InvalidCardBack';
  constructor(readonly reason: 'empty' | 'tooLong') {
    super(`Card back is invalid: ${reason}`);
  }
}

/** TAG-01 */
export class InvalidTagName extends DomainError {
  readonly code = 'InvalidTagName';
  constructor(
    readonly input: string,
    readonly reason: 'length' | 'character',
  ) {
    super(`Tag name "${input}" is invalid: ${reason}`);
  }
}

/** TAG-13 */
export class InvalidTagColor extends DomainError {
  readonly code = 'InvalidTagColor';
  constructor(readonly input: string) {
    super(`"${input}" is not a tag color`);
  }
}

/** CARDTAG-03 */
export class TooManyTags extends DomainError {
  readonly code = 'TooManyTags';
  constructor(readonly max: number) {
    super(`A card has at most ${max} tags`);
  }
}

/** TRASH-02, CARDTAG-02, TRASH-10 */
export class CardIsTrashed extends DomainError {
  readonly code = 'CardIsTrashed';
  constructor(readonly cardId: CardId) {
    super(`Card ${cardId} is in the Trash`);
  }
}

/** TRASH-10 */
export class CardIsNotTrashed extends DomainError {
  readonly code = 'CardIsNotTrashed';
  constructor(readonly cardId: CardId) {
    super(`Card ${cardId} is not in the Trash`);
  }
}

/** CARDTAG-04: replaceTag on a card without the old tag (race or bug). */
export class TagNotOnCard extends DomainError {
  readonly code = 'TagNotOnCard';
  constructor(
    readonly cardId: CardId,
    readonly tagId: TagId,
  ) {
    super(`Card ${cardId} does not have tag ${tagId}`);
  }
}

/** TAG-08, CARD-04: a tag can only merge into another tag of the same user. */
export class TagMergeNotAllowed extends DomainError {
  readonly code = 'TagMergeNotAllowed';
  constructor(
    readonly tagId: TagId,
    readonly intoTagId: TagId,
    readonly reason: 'sameTag' | 'otherUser',
  ) {
    super(`Tag ${tagId} cannot merge into ${intoTagId}: ${reason}`);
  }
}
