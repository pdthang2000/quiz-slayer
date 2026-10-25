import { connectTestDb, resetDb } from './db';
import { PrismaTransactionRunner } from '../../src/prisma/prisma-transaction-runner';
import {
  TagMergeFailed,
  TagMergeNeedsConfirmation,
  TagNotFound,
} from '../../src/card-library/application/errors';
import { CardBack, CardFront } from '../../src/card-library/domain/card-text';
import { RenameTag } from '../../src/card-library/application/rename-tag';
import { Card } from '../../src/card-library/domain/card';
import { TagChanged } from '../../src/card-library/domain/errors';
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

// C-38 (revised) / TAG-15: a confirmed merge re-checks both tags after taking its lock;
// only an unchanged target merges, anything else → 409 with a fresh preview.
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

/** Runs `interfere` right after the merge loaded its cards, before it saves them. */
class InterferingCardRepository extends PrismaCardRepository {
  interfere?: () => Promise<void>;

  override async findByTag(userId: UserId, tagId: TagId) {
    const found = await super.findByTag(userId, tagId);
    const interfere = this.interfere;
    this.interfere = undefined;
    await interfere?.();
    return found;
  }
}

const prisma = connectTestDb();
const other = connectTestDb(); // "another device"
const otherTags = new PrismaTagRepository(other);
const tags = new InterferingTagRepository(prisma);
const cards = new InterferingCardRepository(prisma);
const otherCards = new PrismaCardRepository(other);
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
  await tags.add(pitbull);
  await tags.add(dogs);
  await cards.addAll([
    newCard(user, 'Dog', [pitbull, dogs]),
    newCard(user, 'Rex', [pitbull]),
    newCard(user, 'Fido', [dogs]),
  ]);
  return { pitbull, dogs };
}

/** The preview showed pitbull at version 0. */
const confirmMerge = (tagId: TagId) =>
  renameTag.execute({
    userId: user,
    tagId,
    version: 0,
    name: 'Dogs',
    confirmMerge: true,
  });

async function tagNames() {
  const rows = await prisma.db.tag.findMany({ orderBy: { name: 'asc' } });
  return rows.map((r) => r.name);
}

describe('RenameTag: tags changed between preview and confirmed merge (C-38)', () => {
  it('TAG-15: target unchanged → merges as confirmed', async () => {
    const { pitbull, dogs } = await seed();
    tags.interfere = async () => {}; // the lock is still taken after the preview

    // TAG-16: the merge changes the target's version.
    await expect(confirmMerge(pitbull.id)).resolves.toEqual({
      id: dogs.id,
      version: 1,
    });
    expect(await tagNames()).toEqual(['Dogs']);
  });

  it('TAG-16: the tag being renamed changed meanwhile → TagChanged, nothing merged', async () => {
    const { pitbull } = await seed();
    tags.interfere = async () => {
      const p = (await otherTags.findById(user, pitbull.id))!;
      await otherTags.save(p); // e.g. cards added through #pitbull on the laptop
    };

    await expect(confirmMerge(pitbull.id)).rejects.toBeInstanceOf(TagChanged);
    expect(await tagNames()).toEqual(['Dogs', 'pitbull']);
  });

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
      await otherTags.add(newDogs); // empty new "Dogs"
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

  it('TAG-15: target deleted meanwhile, name free → 409 without a merge target, nothing changed', async () => {
    const { pitbull, dogs } = await seed();
    tags.interfere = async () => {
      await otherTags.delete((await otherTags.findById(user, dogs.id))!);
    };

    const error = await confirmMerge(pitbull.id).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TagMergeNeedsConfirmation);
    expect((error as TagMergeNeedsConfirmation).preview).toEqual({
      into: null,
      intoCount: 0,
      fromCount: 2,
      resultCount: 2,
    });
    expect(await tagNames()).toEqual(['pitbull']);
  });

  it('TAG-15: target deleted meanwhile, another tag took the name → 409 with a fresh preview against it', async () => {
    const { pitbull, dogs } = await seed();
    const newDogs = newTag(user, 'Dogs');
    tags.interfere = async () => {
      await otherTags.delete((await otherTags.findById(user, dogs.id))!);
      await otherTags.add(newDogs);
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

  it('TAG-10: a card saved on another device during the merge → TagMergeFailed, nothing merged (C-40)', async () => {
    const { pitbull } = await seed();
    const rex = (
      await prisma.db.card.findFirstOrThrow({ where: { front: 'Rex' } })
    ).id;
    cards.interfere = async () => {
      // Laptop: Save on Rex (removes #pitbull, so it doesn't wait for the merge's tag lock).
      const r = (await otherCards.findActive(user, rex as Card['id']))!;
      r.edit(CardFront.create('Rex!'), CardBack.create('back'));
      r.removeTag(pitbull.id);
      await otherCards.save(r);
    };

    const error = await confirmMerge(pitbull.id).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TagMergeFailed);
    expect(await tagNames()).toEqual(['Dogs', 'pitbull']);
    expect(
      await prisma.db.cardTag.count({ where: { tagId: pitbull.id } }),
    ).toBe(1); // Dog keeps it
  });
});
