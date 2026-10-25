import { Tag as TagRow } from '@prisma/client';
import { TagId, UserId } from '../domain/ids';
import { Tag } from '../domain/tag';
import { TagColor } from '../domain/tag-color';
import { TagName } from '../domain/tag-name';

export function toTag(row: TagRow): Tag {
  return Tag.reconstitute({
    id: TagId(row.id),
    userId: UserId(row.userId),
    name: TagName.create(row.name),
    color: TagColor.from(row.color),
    version: row.version,
  });
}
