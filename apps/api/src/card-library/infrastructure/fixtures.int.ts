import { randomUUID } from 'node:crypto';
import { Card } from '../domain/card';
import { CardBack, CardFront } from '../domain/card-text';
import { CardId, TagId, UserId } from '../domain/ids';
import { Tag } from '../domain/tag';
import { TagColor } from '../domain/tag-color';
import { TagName } from '../domain/tag-name';

export const newUserId = () => UserId(randomUUID());

export function newTag(userId: UserId, name: string, color = 'blue'): Tag {
  return Tag.create({
    id: TagId(randomUUID()),
    userId,
    name: TagName.create(name),
    color: TagColor.from(color),
  });
}

export function newCard(
  userId: UserId,
  front: string,
  tags: Tag[] = [],
  back = 'back',
): Card {
  return Card.create({
    id: CardId(randomUUID()),
    userId,
    front: CardFront.create(front),
    back: CardBack.create(back),
    tagIds: tags.map((t) => t.id),
  });
}
