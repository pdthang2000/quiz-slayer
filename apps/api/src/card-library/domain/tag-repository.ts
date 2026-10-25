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
  /** Inserts a new tag (from Tag.create) at version 0. TagNameTaken like save. */
  add(tag: Tag): Promise<void>;
  /**
   * TAG-16: writes a loaded tag and bumps its version, only if the stored version is still
   * the one it was loaded at; otherwise TagChanged. Also called with no change to record that
   * cards were added or removed through the tag (CARDTAG-07, CARDTAG-08) or merged into it.
   * Save a loaded tag once. Throws TagNameTaken if another tag of the user has the name (TAG-03, C-20).
   */
  save(tag: Tag): Promise<void>;
  /** TAG-06: removes the tag and all its CardTags. TagChanged like save (TAG-16). */
  delete(tag: Tag): Promise<void>;
  /** TAG-10: locks the tag rows until the transaction ends. Must run inside one (ADR-008). */
  lockForMerge(userId: UserId, tagIds: TagId[]): Promise<void>;
}
