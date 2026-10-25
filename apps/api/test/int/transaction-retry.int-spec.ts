import { connectTestDb, resetDb } from './db';
import {
  newCard,
  newTag,
  newUserId,
} from '../../src/card-library/infrastructure/fixtures.int';
import { PrismaCardRepository } from '../../src/card-library/infrastructure/prisma-card.repository';
import { PrismaTagRepository } from '../../src/card-library/infrastructure/prisma-tag.repository';
import { TransactionConflict } from '../../src/shared/application/transaction-conflict';

// B-11: a card Save and a tag merge can lock each other's rows in opposite order.
// Postgres aborts one of them (deadlock); the transaction runner runs it again.

const prisma = connectTestDb();
const other = connectTestDb(); // "another device"
const user = newUserId();

beforeEach(() => resetDb(prisma));
afterAll(async () => {
  await prisma.onModuleDestroy();
  await other.onModuleDestroy();
});

function signal() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe('Transaction retry (B-11)', () => {
  it('B-11: a Save and a merge that deadlock both succeed, the aborted one after a retry', async () => {
    const pitbull = newTag(user, 'pitbull');
    await new PrismaTagRepository(prisma).add(pitbull);
    const rex = newCard(user, 'Rex');
    await new PrismaCardRepository(prisma).add(rex);

    const tagLocked = signal();
    const cardUpdated = signal();
    const attempts = { merge: 0, save: 0 };

    // Merge: locks the tag, then needs card Rex.
    const merge = prisma.runInTransaction(async () => {
      attempts.merge++;
      await prisma.db
        .$queryRaw`SELECT id FROM tag WHERE id = ${pitbull.id}::uuid FOR UPDATE`;
      tagLocked.resolve();
      await cardUpdated.promise;
      await prisma.db
        .$executeRaw`UPDATE card SET version = version + 1 WHERE id = ${rex.id}::uuid`;
    });
    // Save Rex with #pitbull: locks card Rex, then needs the tag (foreign key check).
    const save = other.runInTransaction(async () => {
      attempts.save++;
      await tagLocked.promise;
      await other.db
        .$executeRaw`UPDATE card SET front = 'Rex!' WHERE id = ${rex.id}::uuid`;
      cardUpdated.resolve();
      await other.db.cardTag.create({
        data: { cardId: rex.id, tagId: pitbull.id, userId: user },
      });
    });

    await Promise.all([merge, save]);
    expect(attempts.merge + attempts.save).toBe(3); // exactly one retry
    const stored = await prisma.db.card.findUniqueOrThrow({
      where: { id: rex.id },
    });
    expect(stored.front).toBe('Rex!');
    expect(stored.version).toBe(1);
    expect(await prisma.db.cardTag.count()).toBe(1);
  });

  it('B-11: still conflicting after 3 retries → TransactionConflict', async () => {
    let attempts = 0;
    const deadlock = Object.assign(new Error('deadlock detected'), {
      code: '40P01',
    });
    await expect(
      prisma.runInTransaction(() => {
        attempts++;
        return Promise.reject(deadlock);
      }),
    ).rejects.toBeInstanceOf(TransactionConflict);
    expect(attempts).toBe(4);
  });

  it('B-11: other errors are not retried', async () => {
    let attempts = 0;
    await expect(
      prisma.runInTransaction(() => {
        attempts++;
        return Promise.reject(new Error('boom'));
      }),
    ).rejects.toThrow('boom');
    expect(attempts).toBe(1);
  });
});
