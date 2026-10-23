import { TagId, UserId } from './ids';
import { Tag } from './tag';
import { TagName } from './tag-name';

export interface TagRepository {
  findById(userId: UserId, tagId: TagId): Promise<Tag | null>;
  /** CARD-04, C-22: only this user's tags; ids of other users' tags are left out. */
  findByIds(userId: UserId, tagIds: TagId[]): Promise<Tag[]>;
  /** TAG-03, TAG-08: an existing tag with this name means create links / rename merges. */
  findByName(userId: UserId, name: TagName): Promise<Tag | null>;
  /**
   * TAG-05, ADR-009: inserts the new tag, or returns the user's existing tag with the same
   * name if another request created it first. Safe inside a transaction (no unique-violation abort).
   */
  findOrInsertByName(tag: Tag): Promise<Tag>;
  /** Throws TagNameTaken if another tag of the user already has the name (TAG-03, C-20). */
  save(tag: Tag): Promise<void>;
  /** TAG-06: removes the tag and all its CardTags. */
  delete(tag: Tag): Promise<void>;
  /** TAG-10: locks the tag rows until the transaction ends. Must run inside one (ADR-008). */
  lockForMerge(userId: UserId, tagIds: TagId[]): Promise<void>;
}
