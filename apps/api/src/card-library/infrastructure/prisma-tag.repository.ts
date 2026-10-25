import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TagChanged, TagNameTaken } from '../domain/errors';
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

  /** TAG-05, ADR-009: INSERT ... ON CONFLICT DO NOTHING, then read whichever tag won. */
  async findOrInsertByName(tag: Tag): Promise<Tag> {
    await this.prisma.db.tag.createMany({
      data: {
        id: tag.id,
        userId: tag.userId,
        name: tag.name.value,
        color: tag.color.value,
      },
      skipDuplicates: true,
    });
    const row = await this.prisma.db.tag.findUniqueOrThrow({
      where: { userId_name: { userId: tag.userId, name: tag.name.value } },
    });
    return row.id === tag.id ? tag : toTag(row);
  }

  /** TAG-03, C-20: a unique violation on (user_id, name) becomes TagNameTaken. */
  async add(tag: Tag): Promise<void> {
    try {
      await this.prisma.db.tag.create({
        data: {
          id: tag.id,
          userId: tag.userId,
          name: tag.name.value,
          color: tag.color.value,
          version: 0,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new TagNameTaken(tag.name.value);
      throw error;
    }
  }

  /** TAG-16: WHERE version = loaded version, then +1. TAG-03, C-20 as in add. */
  async save(tag: Tag): Promise<void> {
    let count: number;
    try {
      ({ count } = await this.prisma.db.tag.updateMany({
        where: { id: tag.id, userId: tag.userId, version: tag.version },
        data: { name: tag.name.value, version: { increment: 1 } },
      }));
    } catch (error) {
      if (isUniqueViolation(error)) throw new TagNameTaken(tag.name.value);
      throw error;
    }
    if (count === 0) throw new TagChanged(tag.id);
  }

  /** TAG-16. Rows are locked in id order so concurrent card changes don't deadlock (B-11). */
  async markCardsChanged(userId: UserId, tagIds: TagId[]): Promise<void> {
    const ids = [...new Set(tagIds)];
    if (ids.length === 0) return;
    await this.prisma.db.$executeRaw`
      UPDATE tag SET version = version + 1
      WHERE id IN (
        SELECT id FROM tag
        WHERE user_id = ${userId}::uuid AND id = ANY(${ids}::uuid[])
        ORDER BY id
        FOR UPDATE)`;
  }

  /**
   * TAG-06, TAG-07, TRASH-06: hard delete; card_tag rows go with it (ON DELETE CASCADE).
   * TAG-16: only at the loaded version.
   */
  async delete(tag: Tag): Promise<void> {
    const { count } = await this.prisma.db.tag.deleteMany({
      where: { id: tag.id, userId: tag.userId, version: tag.version },
    });
    if (count === 0) throw new TagChanged(tag.id);
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
