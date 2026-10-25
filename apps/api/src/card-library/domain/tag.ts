import { AggregateRoot } from './aggregate-root';
import { TagChanged, TagMergeNotAllowed } from './errors';
import { TagEvent } from './events';
import { TagId, UserId } from './ids';
import { TagColor } from './tag-color';
import { TagName } from './tag-name';

export type TagProps = {
  id: TagId;
  userId: UserId;
  name: TagName;
  color: TagColor;
  /** TAG-16: the stored version this tag was loaded at. */
  version: number;
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
    /** TAG-16: 0 for a new tag; the repository changes it only if the stored one still matches. */
    readonly version: number,
  ) {
    super();
  }

  /** TAG-12: the caller passes TagColor.random() for a new tag. */
  static create(props: Omit<TagProps, 'version'>): Tag {
    const tag = new Tag(props.id, props.userId, props.name, props.color, 0);
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
    return new Tag(
      props.id,
      props.userId,
      props.name,
      props.color,
      props.version,
    );
  }

  get name(): TagName {
    return this._name;
  }

  /** TAG-16, CONFLICT-01: the client's change is based on the version it was shown. */
  assertVersion(version: number): void {
    if (version !== this.version) throw new TagChanged(this.id);
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
   * The target keeps its name and color (TAG-12). Cards change via card.replaceTagForMerge.
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
