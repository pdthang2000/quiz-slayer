import { AggregateRoot } from './aggregate-root';
import { CardBack, CardFront } from './card-text';
import {
  CardChanged,
  CardIsNotTrashed,
  CardIsTrashed,
  TagNotOnCard,
  TooManyTags,
} from './errors';
import { CardEvent } from './events';
import { CardId, TagId, UserId } from './ids';

export type CardState = 'Active' | 'Trashed';

export type CardProps = {
  id: CardId;
  userId: UserId;
  front: CardFront;
  back: CardBack;
  state: CardState;
  /** TRASH-12: set by moveToTrash, cleared by restore. */
  trashedAt: Date | null;
  tagIds: TagId[];
  /** CARD-08: the stored version this card was loaded at. */
  version: number;
};

/** A flashcard. Owns its CardTags (the set of tag ids). */
export class Card extends AggregateRoot<CardEvent> {
  /** CARDTAG-03 */
  static readonly MAX_TAGS = 20;

  private constructor(
    readonly id: CardId,
    readonly userId: UserId,
    private _front: CardFront,
    private _back: CardBack,
    private _state: CardState,
    private _trashedAt: Date | null,
    private readonly _tagIds: Set<TagId>,
    /** CARD-08: 0 for a new card; the repository saves only if the stored one still matches. */
    readonly version: number,
  ) {
    super();
  }

  /** CARDTAG-06: duplicate tag ids are kept once; CARDTAG-03 is checked after. */
  static create(props: {
    id: CardId;
    userId: UserId;
    front: CardFront;
    back: CardBack;
    tagIds: TagId[];
  }): Card {
    const tagIds = new Set(props.tagIds);
    if (tagIds.size > Card.MAX_TAGS) throw new TooManyTags(Card.MAX_TAGS);
    const card = new Card(
      props.id,
      props.userId,
      props.front,
      props.back,
      'Active',
      null,
      tagIds,
      0,
    );
    card.record({
      type: 'CardCreated',
      cardId: card.id,
      userId: card.userId,
      tagIds: [...tagIds],
    });
    return card;
  }

  /** Rebuilds a stored card. No rules re-run, no events. */
  static reconstitute(props: CardProps): Card {
    return new Card(
      props.id,
      props.userId,
      props.front,
      props.back,
      props.state,
      props.trashedAt,
      new Set(props.tagIds),
      props.version,
    );
  }

  get front(): CardFront {
    return this._front;
  }

  get back(): CardBack {
    return this._back;
  }

  get state(): CardState {
    return this._state;
  }

  get trashedAt(): Date | null {
    return this._trashedAt;
  }

  get tagIds(): TagId[] {
    return [...this._tagIds];
  }

  hasTag(tagId: TagId): boolean {
    return this._tagIds.has(tagId);
  }

  /** CARD-08: the client's change is based on the version it was shown. */
  assertVersion(version: number): void {
    if (version !== this.version) throw new CardChanged(this.id);
  }

  /** TRASH-02: active only. Nothing changed → no event. */
  edit(front: CardFront, back: CardBack): void {
    this.assertActive();
    if (this._front.equals(front) && this._back.equals(back)) return;
    this._front = front;
    this._back = back;
    this.record({ type: 'CardEdited', cardId: this.id, userId: this.userId });
  }

  /** CARDTAG-02, CARDTAG-03, CARDTAG-05 */
  addTag(tagId: TagId): void {
    this.assertActive();
    if (this._tagIds.has(tagId)) return;
    if (this._tagIds.size >= Card.MAX_TAGS)
      throw new TooManyTags(Card.MAX_TAGS, this.id);
    this._tagIds.add(tagId);
    this.record({
      type: 'CardTagged',
      cardId: this.id,
      userId: this.userId,
      tagId,
    });
  }

  /** CARDTAG-01, CARDTAG-02, CARDTAG-05 */
  removeTag(tagId: TagId): void {
    this.assertActive();
    if (!this._tagIds.delete(tagId)) return;
    this.record({
      type: 'CardUntagged',
      cardId: this.id,
      userId: this.userId,
      tagId,
    });
  }

  /**
   * CARD-07: the editor's Save sends the full tag list; only the difference is applied
   * (CardUntagged / CardTagged per tag). CARDTAG-06 dedupes; CARDTAG-03 is checked
   * on the result before anything changes. Removals go first, so swapping a tag at 20 works.
   */
  setTags(tagIds: TagId[]): void {
    this.assertActive();
    const target = new Set(tagIds);
    if (target.size > Card.MAX_TAGS) throw new TooManyTags(Card.MAX_TAGS);
    for (const tagId of this.tagIds) {
      if (!target.has(tagId)) this.removeTag(tagId);
    }
    for (const tagId of target) this.addTag(tagId);
  }

  /**
   * CARDTAG-04: tag merge only (TAG-08, TAG-10). Allowed on a trashed card (TAG-09).
   * Never increases the tag count. No per-card event: the merge raises TagsMerged.
   */
  replaceTagForMerge(from: TagId, to: TagId): void {
    if (!this._tagIds.delete(from)) throw new TagNotOnCard(this.id, from);
    this._tagIds.add(to);
  }

  /** TRASH-01, TRASH-04 (tags kept), TRASH-10, TRASH-12 */
  moveToTrash(at: Date): void {
    this.assertActive();
    this._state = 'Trashed';
    this._trashedAt = at;
    this.record({
      type: 'CardMovedToTrash',
      cardId: this.id,
      userId: this.userId,
    });
  }

  /** TRASH-04, TRASH-10, TRASH-12 */
  restore(): void {
    this.assertTrashed();
    this._state = 'Active';
    this._trashedAt = null;
    this.record({ type: 'CardRestored', cardId: this.id, userId: this.userId });
  }

  /** TRASH-05, TRASH-09, TRASH-10: only from the Trash. The repository removes the card. */
  deletePermanently(): void {
    this.assertTrashed();
    this.record({
      type: 'CardDeletedPermanently',
      cardId: this.id,
      userId: this.userId,
    });
  }

  private assertActive(): void {
    if (this._state === 'Trashed') throw new CardIsTrashed(this.id);
  }

  private assertTrashed(): void {
    if (this._state === 'Active') throw new CardIsNotTrashed(this.id);
  }
}
