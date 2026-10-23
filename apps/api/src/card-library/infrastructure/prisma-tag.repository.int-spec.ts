import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { connectTestDb, resetDb } from '../../../test/int/db';
import { TagNameTaken } from '../domain/errors';
import { TagName } from '../domain/tag-name';
import { PrismaCardRepository } from './prisma-card.repository';
import { PrismaTagRepository } from './prisma-tag.repository';
import { newCard, newTag, newUserId } from './fixtures.int';

const prisma = connectTestDb();
const cards = new PrismaCardRepository(prisma);
const tags = new PrismaTagRepository(prisma);
const user = newUserId();

beforeEach(() => resetDb(prisma));
afterAll(() => prisma.onModuleDestroy());

/** Inserts a tag row directly, bypassing the repository and the domain. */
function insertRaw(userId: string, name: string) {
  return prisma.db.tag.create({
    data: { id: randomUUID(), userId, name, color: 'blue' },
  });
}

describe('PrismaTagRepository', () => {
  it('saves and loads a tag by id and by name', async () => {
    const tag = newTag(user, 'pit bull');
    await tags.save(tag);
    expect((await tags.findById(user, tag.id))?.name.value).toBe('pit bull');
    expect(
      (await tags.findByName(user, TagName.create(' pit  bull ')))?.id,
    ).toBe(tag.id);
  });

  it('TAG-12: the color is stored, so it stays the same', async () => {
    const tag = newTag(user, 'Animals', 'teal');
    await tags.save(tag);
    tag.rename(TagName.create('Mammals'));
    await tags.save(tag);
    expect((await tags.findById(user, tag.id))?.color.value).toBe('teal');
  });

  it('TAG-03: inserting a duplicate tag name fails at the DB too', async () => {
    await insertRaw(user, 'Animals');
    await expect(insertRaw(user, 'Animals')).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
  });

  it('TAG-03: a save that hits the unique constraint throws TagNameTaken', async () => {
    await tags.save(newTag(user, 'Animals'));
    await expect(tags.save(newTag(user, 'Animals'))).rejects.toBeInstanceOf(
      TagNameTaken,
    );
  });

  it('TAG-03: a rename onto a taken name throws TagNameTaken', async () => {
    await tags.save(newTag(user, 'Dogs'));
    const pitbull = newTag(user, 'pitbull');
    await tags.save(pitbull);
    pitbull.rename(TagName.create('Dogs'));
    await expect(tags.save(pitbull)).rejects.toBeInstanceOf(TagNameTaken);
  });

  it('TAG-03: two users can have the same tag name', async () => {
    await tags.save(newTag(user, 'Animals'));
    await expect(
      tags.save(newTag(newUserId(), 'Animals')),
    ).resolves.toBeUndefined();
  });

  it('TAG-02: Animals and animals are two tags', async () => {
    await tags.save(newTag(user, 'Animals'));
    await tags.save(newTag(user, 'animals'));
    expect(await prisma.db.tag.count({ where: { userId: user } })).toBe(2);
  });

  it('TAG-01: the DB rejects a tag name that is not NFC (ADR-003)', async () => {
    await expect(insertRaw(user, 'động')).rejects.toThrow();
  });

  it('TAG-06: deleting a tag removes its CardTags; cards stay', async () => {
    const animals = newTag(user, 'Animals');
    await tags.save(animals);
    const cat = newCard(user, 'Cat', [animals]);
    const fish = newCard(user, 'Fish', [animals]);
    await cards.saveAll([cat, fish]);

    await tags.delete(animals);

    expect(await tags.findById(user, animals.id)).toBeNull();
    expect((await cards.findActive(user, cat.id))?.tagIds).toEqual([]);
    expect((await cards.findActive(user, fish.id))?.tagIds).toEqual([]);
  });

  it("TAG-07: a deleted tag's name can be reused immediately", async () => {
    const animals = newTag(user, 'Animals');
    await tags.save(animals);
    await tags.delete(animals);
    await expect(tags.save(newTag(user, 'Animals'))).resolves.toBeUndefined();
  });

  it('TAG-11: a rename changes only the tag row; cards keep the same tag id', async () => {
    const animals = newTag(user, 'Animals');
    await tags.save(animals);
    const cat = newCard(user, 'Cat', [animals]);
    await cards.save(cat);

    animals.rename(TagName.create('Mammals'));
    await tags.save(animals);

    expect((await cards.findActive(user, cat.id))?.tagIds).toEqual([
      animals.id,
    ]);
    expect((await tags.findById(user, animals.id))?.name.value).toBe('Mammals');
  });

  it('lockForMerge refuses to run outside a transaction', async () => {
    const tag = newTag(user, 'Animals');
    await tags.save(tag);
    await expect(tags.lockForMerge(user, [tag.id])).rejects.toThrow(
      /inside a transaction/,
    );
  });

  it("CARD-04: findByIds returns only the user's own tags", async () => {
    const mine = newTag(user, 'Animals');
    const alsoMine = newTag(user, 'Dogs');
    const theirs = newTag(newUserId(), 'Animals');
    await tags.save(mine);
    await tags.save(alsoMine);
    await tags.save(theirs);

    const found = await tags.findByIds(user, [mine.id, alsoMine.id, theirs.id]);
    expect(found.map((t) => t.id).sort()).toEqual(
      [mine.id, alsoMine.id].sort(),
    );
  });
});
