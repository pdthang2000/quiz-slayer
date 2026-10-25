import { connectTestDb, resetDb } from './db';
import { PrismaTransactionRunner } from '../../src/prisma/prisma-transaction-runner';
import {
  TagMergeNeedsConfirmation,
  TagNotFound,
} from '../../src/card-library/application/errors';
import { RenameTag } from '../../src/card-library/application/rename-tag';
import { TagId, UserId } from '../../src/card-library/domain/ids';
import { TagName } from '../../src/card-library/domain/tag-name';
import {
  newCard,
  newTag,
  newUserId,
} from '../../src/card-library/infrastructure/fixtures.int';
import { PrismaCardLibraryQueries } from '../../src/card-library/infrastructure/prisma-card-library.queries';
import { PrismaCardRepository } from '../../src/card-library/infrastructure/prisma-card.repository';
import { PrismaTagRepository } from '../../src/card-library/infrastructure/prisma-tag.repository';

// C-38 / TAG-15: a confirmed merge re-checks both tags after taking its lock.
// `interfere` runs on a second connection right before the lock, i.e. exactly in the
// window between the user's preview and the merge.

class InterferingTagRepository extends PrismaTagRepository {
  interfere?: () => Promise<void>;

  override async lockForMerge(userId: UserId, tagIds: TagId[]) {
    const interfere = this.interfere;
    this.interfere = undefined;
    await interfere?.();
    return super.lockForMerge(userId, tagIds);
  }
}

const prisma = connectTestDb();
const other = connectTestDb(); // "another device"
const otherTags = new PrismaTagRepository(other);
const tags = new InterferingTagRepository(prisma);
const cards = new PrismaCardRepository(prisma);
const renameTag = new RenameTag(
  new PrismaTransactionRunner(prisma),
  tags,
  cards,
  new PrismaCardLibraryQueries(prisma),
  { publish: () => {} },
);
const user = newUserId();

beforeEach(() => resetDb(prisma));
afterAll(async () => {
  await prisma.onModuleDestroy();
  await other.onModuleDestroy();
});

/** pitbull [Dog, Rex]  Dogs [Dog, Fido] */
async function seed() {
  const pitbull = newTag(user, 'pitbull');
  const dogs = newTag(user, 'Dogs');
  await tags.save(pitbull);
  await tags.save(dogs);
  await cards.saveAll([
    newCard(user, 'Dog', [pitbull, dogs]),
    newCard(user, 'Rex', [pitbull]),
    newCard(user, 'Fido', [dogs]),
  ]);
  return { pitbull, dogs };
}

const confirmMerge = (tagId: TagId) =>
  renameTag.execute({ userId: user, tagId, name: 'Dogs', confirmMerge: true });

async function tagNames() {
  const rows = await prisma.db.tag.findMany({ orderBy: { name: 'asc' } });
  return rows.map((r) => r.name);
}

describe('RenameTag: tags changed between preview and confirmed merge (C-38)', () => {
  it('TAG-15: target renamed meanwhile, name now free → 409 without a merge target, nothing changed', async () => {
    const { pitbull, dogs } = await seed();
    tags.interfere = async () => {
      const d = (await otherTags.findById(user, dogs.id))!;
      d.rename(TagName.create('Hounds'));
      await otherTags.save(d);
    };

    const error = await confirmMerge(pitbull.id).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TagMergeNeedsConfirmation);
    expect((error as TagMergeNeedsConfirmation).preview).toEqual({
      into: null,
      intoCount: 0,
      fromCount: 2,
      resultCount: 2,
    });
    expect(await tagNames()).toEqual(['Hounds', 'pitbull']);
  });

  it('TAG-15: target renamed meanwhile, another tag now holds the name → 409 with a fresh preview against it', async () => {
    const { pitbull, dogs } = await seed();
    const newDogs = newTag(user, 'Dogs');
    tags.interfere = async () => {
      const d = (await otherTags.findById(user, dogs.id))!;
      d.rename(TagName.create('Hounds'));
      await otherTags.save(d);
      await otherTags.save(newDogs); // empty new "Dogs"
    };

    const error = await confirmMerge(pitbull.id).catch((e: unknown) => e);
    expect((error as TagMergeNeedsConfirmation).preview).toEqual({
      into: { id: newDogs.id, name: 'Dogs' },
      intoCount: 0,
      fromCount: 2,
      resultCount: 2,
    });
    expect(await tagNames()).toEqual(['Dogs', 'Hounds', 'pitbull']);
  });

  it('TAG-15: target deleted meanwhile, name free → plain rename', async () => {
    const { pitbull, dogs } = await seed();
    tags.interfere = async () => {
      await otherTags.delete((await otherTags.findById(user, dogs.id))!);
    };

    await expect(confirmMerge(pitbull.id)).resolves.toBe(pitbull.id);
    expect(await tagNames()).toEqual(['Dogs']);
    expect((await tags.findById(user, pitbull.id))?.name.value).toBe('Dogs');
  });

  it('TAG-15: target deleted meanwhile, another tag took the name → 409 with a fresh preview against it', async () => {
    const { pitbull, dogs } = await seed();
    const newDogs = newTag(user, 'Dogs');
    tags.interfere = async () => {
      await otherTags.delete((await otherTags.findById(user, dogs.id))!);
      await otherTags.save(newDogs);
    };

    const error = await confirmMerge(pitbull.id).catch((e: unknown) => e);
    expect((error as TagMergeNeedsConfirmation).preview.into).toEqual({
      id: newDogs.id,
      name: 'Dogs',
    });
    expect(await tagNames()).toEqual(['Dogs', 'pitbull']);
  });

  it('TAG-15: the tag being renamed was deleted meanwhile → TagNotFound', async () => {
    const { pitbull } = await seed();
    tags.interfere = async () => {
      await otherTags.delete((await otherTags.findById(user, pitbull.id))!);
    };

    await expect(confirmMerge(pitbull.id)).rejects.toBeInstanceOf(TagNotFound);
    expect(await tagNames()).toEqual(['Dogs']);
  });
});
