import { connectTestDb, resetDb } from '../../../test/int/db';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner';
import { Card } from '../domain/card';
import { TagNoLongerExists, TagNotOnCard } from '../domain/errors';
import { Tag } from '../domain/tag';
import { PrismaCardRepository } from './prisma-card.repository';
import { PrismaTagRepository } from './prisma-tag.repository';
import { newCard, newTag, newUserId } from './fixtures.int';

// The TAG-10 merge, run against real Postgres with the real repositories.
// The use case that wraps this comes in Phase 3.

const prisma = connectTestDb();
const transactions = new PrismaTransactionRunner(prisma);
const cards = new PrismaCardRepository(prisma);
const tags = new PrismaTagRepository(prisma);
const user = newUserId();

beforeEach(() => resetDb(prisma));
afterAll(() => prisma.onModuleDestroy());

/**
 * TAG-10 as written in card-library.md. `beforeSave` lets a test interfere;
 * `saveEach` saves card by card, so a missing rollback would leave partial writes.
 */
function merge(
  from: Tag,
  into: Tag,
  options: { beforeSave?: (cards: Card[]) => void; saveEach?: boolean } = {},
): Promise<void> {
  return transactions.run(async () => {
    await tags.lockForMerge(user, [from.id, into.id]);
    const affected = await cards.findByTag(user, from.id);
    options.beforeSave?.(affected);
    if (options.saveEach) {
      for (const card of affected) {
        card.replaceTagForMerge(from.id, into.id);
        await cards.save(card);
      }
    } else {
      for (const card of affected) card.replaceTagForMerge(from.id, into.id);
      await cards.saveAll(affected);
    }
    from.mergeInto(into);
    await tags.delete(from);
  });
}

async function snapshot() {
  return {
    tags: await prisma.db.tag.findMany({ orderBy: { name: 'asc' } }),
    cardTags: await prisma.db.cardTag.findMany({
      orderBy: [{ cardId: 'asc' }, { tagId: 'asc' }],
    }),
    cards: await prisma.db.card.findMany({ orderBy: { id: 'asc' } }),
  };
}

/** pitbull [Dog, Rex, Max]  Dogs [Dog, Fido], Rex trashed. The TAG-08 example. */
async function seed() {
  const pitbull = newTag(user, 'pitbull', 'red');
  const dogs = newTag(user, 'Dogs', 'green');
  await tags.save(pitbull);
  await tags.save(dogs);
  const dog = newCard(user, 'Dog', [pitbull, dogs]);
  const rex = newCard(user, 'Rex', [pitbull]);
  rex.moveToTrash(new Date());
  const max = newCard(user, 'Max', [pitbull]);
  const fido = newCard(user, 'Fido', [dogs]);
  await cards.saveAll([dog, rex, max, fido]);
  return { pitbull, dogs, dog, rex, max, fido };
}

describe('Tag merge (TAG-08, TAG-09, TAG-10)', () => {
  it('TAG-08: every card with A gets B and A is deleted; a card with both keeps one CardTag', async () => {
    const { pitbull, dogs, dog } = await seed();

    await merge(pitbull, dogs);

    expect(await tags.findById(user, pitbull.id)).toBeNull();
    const onDogs = await cards.findByTag(user, dogs.id);
    expect(onDogs.map((c) => c.front.value).sort()).toEqual([
      'Dog',
      'Fido',
      'Max',
      'Rex',
    ]);
    expect((await cards.findActive(user, dog.id))?.tagIds).toEqual([dogs.id]);
  });

  it('TAG-09: the merge also moves the CardTags of trashed cards', async () => {
    const { pitbull, dogs, rex } = await seed();

    await merge(pitbull, dogs);

    const trashedRex = await cards.findTrashed(user, rex.id);
    expect(trashedRex?.tagIds).toEqual([dogs.id]);
  });

  it('TAG-12: after a merge the result keeps the existing tag color', async () => {
    const { pitbull, dogs } = await seed();
    await merge(pitbull, dogs);
    expect((await tags.findById(user, dogs.id))?.color.value).toBe('green');
  });

  it('TAG-10: a merge where one card throws rolls back completely (cards and both tags unchanged)', async () => {
    const { pitbull, dogs } = await seed();
    const before = await snapshot();

    // The last card lost tag A in memory (e.g. edited in another tab), so
    // replaceTagForMerge throws after the earlier cards were already saved.
    const failing = merge(pitbull, dogs, {
      saveEach: true,
      beforeSave: (affected) => {
        const last = affected.filter((c) => c.state === 'Active').at(-1)!;
        last.removeTag(pitbull.id);
        affected.splice(affected.indexOf(last), 1);
        affected.push(last);
      },
    });

    await expect(failing).rejects.toBeInstanceOf(TagNotOnCard);
    expect(await snapshot()).toEqual(before);
  });

  it('TAG-10: tagging a card with A waits for the merge lock, then fails with TagNoLongerExists (C-21)', async () => {
    const { pitbull, dogs } = await seed();
    const late = newCard(user, 'Late');
    await cards.save(late);

    let releaseMerge!: () => void;
    const mergeMayFinish = new Promise<void>((r) => (releaseMerge = r));
    let locked!: () => void;
    const lockTaken = new Promise<void>((r) => (locked = r));

    const merging = transactions.run(async () => {
      await tags.lockForMerge(user, [pitbull.id, dogs.id]);
      locked();
      await mergeMayFinish;
      const affected = await cards.findByTag(user, pitbull.id);
      for (const c of affected) c.replaceTagForMerge(pitbull.id, dogs.id);
      await cards.saveAll(affected);
      await tags.delete(pitbull);
    });

    await lockTaken;
    late.addTag(pitbull.id);
    let tagged = false;
    const tagging = cards.save(late).then(
      () => (tagged = true),
      (error: unknown) => error,
    );

    await new Promise((r) => setTimeout(r, 300));
    expect(tagged).toBe(false); // blocked by FOR UPDATE

    releaseMerge();
    await merging;
    expect(await tagging).toBeInstanceOf(TagNoLongerExists); // pitbull is gone
    expect(
      await prisma.db.cardTag.count({ where: { tagId: pitbull.id } }),
    ).toBe(0);
  });

  it('TAG-10: merging a tag on 1000 cards succeeds', async () => {
    const pitbull = newTag(user, 'pitbull');
    const dogs = newTag(user, 'Dogs');
    await tags.save(pitbull);
    await tags.save(dogs);
    const many = Array.from({ length: 1000 }, (_, i) =>
      newCard(user, `Dog ${i}`, i % 2 === 0 ? [pitbull, dogs] : [pitbull]),
    );
    await cards.saveAll(many);

    const started = Date.now();
    await merge(pitbull, dogs);
    const elapsed = Date.now() - started;

    expect(await tags.findById(user, pitbull.id)).toBeNull();
    expect(await prisma.db.cardTag.count({ where: { tagId: dogs.id } })).toBe(
      1000,
    );
    expect(elapsed).toBeLessThan(30_000); // the transaction timeout
  }, 60_000);
});
