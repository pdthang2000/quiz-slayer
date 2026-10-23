import { Prisma } from '@prisma/client';
import { Card } from '../domain/card';
import { CardBack, CardFront } from '../domain/card-text';
import { CardId, TagId, UserId } from '../domain/ids';

export const cardInclude = {
  tags: { select: { tagId: true } },
} satisfies Prisma.CardInclude;

export type CardRow = Prisma.CardGetPayload<{ include: typeof cardInclude }>;

export function toCard(row: CardRow): Card {
  return Card.reconstitute({
    id: CardId(row.id),
    userId: UserId(row.userId),
    front: CardFront.create(row.front),
    back: CardBack.create(row.back),
    state: row.state,
    tagIds: row.tags.map((t) => TagId(t.tagId)),
  });
}

export function toCardData(card: Card) {
  return {
    front: card.front.value,
    back: card.back.value,
    state: card.state,
  } satisfies Prisma.CardUpdateInput;
}
