import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TagNameTaken } from '../domain/errors';
import { TagId, UserId } from '../domain/ids';
import { Tag } from '../domain/tag';
import { TagName } from '../domain/tag-name';
import { TagRepository } from '../domain/tag-repository';
import { toTag } from './tag.mapper';

@Injectable()
export class PrismaTagRepository implements TagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: UserId, tagId: TagId): Promise<Tag | null> {
    const row = await this.prisma.db.tag.findFirst({
      where: { id: tagId, userId },
    });
    return row ? toTag(row) : null;
  }

  /** CARD-04, C-22 */
  async findByIds(userId: UserId, tagIds: TagId[]): Promise<Tag[]> {
    const rows = await this.prisma.db.tag.findMany({
      where: { userId, id: { in: tagIds } },
    });
    return rows.map(toTag);
  }

  async findByName(userId: UserId, name: TagName): Promise<Tag | null> {
    const row = await this.prisma.db.tag.findUnique({
      where: { userId_name: { userId, name: name.value } },
    });
    return row ? toTag(row) : null;
  }

  /** TAG-03, C-20: a unique violation on (user_id, name) becomes TagNameTaken. */
  async save(tag: Tag): Promise<void> {
    try {
      await this.prisma.db.tag.upsert({
        where: { id: tag.id },
        create: {
          id: tag.id,
          userId: tag.userId,
          name: tag.name.value,
          color: tag.color.value,
        },
        update: { name: tag.name.value },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new TagNameTaken(tag.name.value);
      throw error;
    }
  }

  /** TAG-06, TAG-07, TRASH-06: hard delete; card_tag rows go with it (ON DELETE CASCADE). */
  async delete(tag: Tag): Promise<void> {
    await this.prisma.db.tag.deleteMany({
      where: { id: tag.id, userId: tag.userId },
    });
  }

  /**
   * TAG-10: FOR UPDATE blocks a concurrent CardTag insert for these tags (its foreign
   * key check needs a KEY SHARE lock) until the merge commits. Sorted to avoid deadlocks.
   */
  async lockForMerge(userId: UserId, tagIds: TagId[]): Promise<void> {
    if (!this.prisma.inTransaction) {
      throw new Error('lockForMerge must run inside a transaction (ADR-008)');
    }
    await this.prisma.db.$queryRaw`
      SELECT id FROM tag
      WHERE user_id = ${userId}::uuid AND id = ANY(${tagIds}::uuid[])
      ORDER BY id
      FOR UPDATE`;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
