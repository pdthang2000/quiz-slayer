import { TagId, UserId } from './ids';
import { Tag } from './tag';
import { TagName } from './tag-name';

export interface TagRepository {
  findById(userId: UserId, tagId: TagId): Promise<Tag | null>;
  /** TAG-03, TAG-08: an existing tag with this name means create links / rename merges. */
  findByName(userId: UserId, name: TagName): Promise<Tag | null>;
  save(tag: Tag): Promise<void>;
  /** TAG-06: removes the tag and all its CardTags. */
  delete(tag: Tag): Promise<void>;
}
