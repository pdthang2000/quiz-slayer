import { AggregateRoot } from './aggregate-root';
import { TagMergeNotAllowed } from './errors';
import { TagEvent } from './events';
import { TagId, UserId } from './ids';
import { TagColor } from './tag-color';
import { TagName } from './tag-name';

export type TagProps = {
  id: TagId;
  userId: UserId;
  name: TagName;
  color: TagColor;
};

/**
 * A user's label. Cards refer to it by id only (TAG-11).
 * Name uniqueness per user (TAG-03) needs the other tags, so the application layer
 * checks it and turns a rename onto an existing name into a merge (TAG-08).
 */
export class Tag extends AggregateRoot<TagEvent> {
  private constructor(
    readonly id: TagId,
    readonly userId: UserId,
    private _name: TagName,
    readonly color: TagColor,
  ) {
    super();
  }

  /** TAG-12: the caller passes TagColor.random() for a new tag. */
  static create(props: TagProps): Tag {
    const tag = new Tag(props.id, props.userId, props.name, props.color);
    tag.record({
      type: 'TagCreated',
      tagId: tag.id,
      userId: tag.userId,
      name: tag.name.value,
    });
    return tag;
  }

  /** Rebuilds a stored tag. No rules re-run, no events. */
  static reconstitute(props: TagProps): Tag {
    return new Tag(props.id, props.userId, props.name, props.color);
  }

  get name(): TagName {
    return this._name;
  }

  /** TAG-11 (cards untouched), TAG-12 (color kept), TAG-14 (same name → no-op). */
  rename(name: TagName): void {
    if (this._name.equals(name)) return;
    const from = this._name.value;
    this._name = name;
    this.record({
      type: 'TagRenamed',
      tagId: this.id,
      userId: this.userId,
      from,
      to: name.value,
    });
  }

  /**
   * TAG-08, TAG-10: this tag is merged into `target` and goes away.
   * The target keeps its name and color (TAG-12). Cards change via card.replaceTag.
   */
  mergeInto(target: Tag): void {
    if (target.id === this.id) {
      throw new TagMergeNotAllowed(this.id, target.id, 'sameTag');
    }
    if (target.userId !== this.userId) {
      throw new TagMergeNotAllowed(this.id, target.id, 'otherUser');
    }
    this.record({
      type: 'TagsMerged',
      userId: this.userId,
      tagId: this.id,
      intoTagId: target.id,
    });
  }

  /** TAG-06, TAG-07: hard delete. The repository removes the tag and its CardTags. */
  delete(): void {
    this.record({ type: 'TagDeleted', tagId: this.id, userId: this.userId });
  }
}
