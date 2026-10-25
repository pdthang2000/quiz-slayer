import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { connectTestDb, resetDb } from '../../../test/int/db';
import { TagChanged, TagNameTaken } from '../domain/errors';
import { TagId } from '../domain/ids';
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

/** A loaded tag is saved once (TAG-16); load it again for the next change. */
const load = async (id: TagId) => (await tags.findById(user, id))!;

describe('PrismaTagRepository', () => {
  it('adds and loads a tag by id and by name', async () => {
    const tag = newTag(user, 'pit bull');
    await tags.add(tag);
    expect((await tags.findById(user, tag.id))?.name.value).toBe('pit bull');
    expect(
      (await tags.findByName(user, TagName.create(' pit  bull ')))?.id,
    ).toBe(tag.id);
  });

  it('TAG-12: the color is stored, so it stays the same', async () => {
    const tag = newTag(user, 'Animals', 'teal');
    await tags.add(tag);
    const loaded = await load(tag.id);
    loaded.rename(TagName.create('Mammals'));
    await tags.save(loaded);
    expect((await tags.findById(user, tag.id))?.color.value).toBe('teal');
  });

  it('TAG-03: inserting a duplicate tag name fails at the DB too', async () => {
    await insertRaw(user, 'Animals');
    await expect(insertRaw(user, 'Animals')).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
  });

  it('TAG-03: an add that hits the unique constraint throws TagNameTaken', async () => {
    await tags.add(newTag(user, 'Animals'));
    await expect(tags.add(newTag(user, 'Animals'))).rejects.toBeInstanceOf(
      TagNameTaken,
    );
  });

  it('TAG-03: a rename onto a taken name throws TagNameTaken', async () => {
    await tags.add(newTag(user, 'Dogs'));
    const pitbull = newTag(user, 'pitbull');
    await tags.add(pitbull);
    const loaded = await load(pitbull.id);
    loaded.rename(TagName.create('Dogs'));
    await expect(tags.save(loaded)).rejects.toBeInstanceOf(TagNameTaken);
  });

  it('TAG-03: two users can have the same tag name', async () => {
    await tags.add(newTag(user, 'Animals'));
    await expect(
      tags.add(newTag(newUserId(), 'Animals')),
    ).resolves.toBeUndefined();
  });

  it('TAG-02: Animals and animals are two tags', async () => {
    await tags.add(newTag(user, 'Animals'));
    await tags.add(newTag(user, 'animals'));
    expect(await prisma.db.tag.count({ where: { userId: user } })).toBe(2);
  });

  it('TAG-01: the DB rejects a tag name that is not NFC (ADR-003)', async () => {
    await expect(insertRaw(user, 'động'.normalize('NFD'))).rejects.toThrow();
  });

  it('TAG-06: deleting a tag removes its CardTags; cards stay', async () => {
    const animals = newTag(user, 'Animals');
    await tags.add(animals);
    const cat = newCard(user, 'Cat', [animals]);
    const fish = newCard(user, 'Fish', [animals]);
    await cards.addAll([cat, fish]);

    await tags.delete(animals);

    expect(await tags.findById(user, animals.id)).toBeNull();
    expect((await cards.findActive(user, cat.id))?.tagIds).toEqual([]);
    expect((await cards.findActive(user, fish.id))?.tagIds).toEqual([]);
  });

  it("TAG-07: a deleted tag's name can be reused immediately", async () => {
    const animals = newTag(user, 'Animals');
    await tags.add(animals);
    await tags.delete(animals);
    await expect(tags.add(newTag(user, 'Animals'))).resolves.toBeUndefined();
  });

  it('TAG-11: a rename changes only the tag row; cards keep the same tag id', async () => {
    const animals = newTag(user, 'Animals');
    await tags.add(animals);
    const cat = newCard(user, 'Cat', [animals]);
    await cards.add(cat);

    const loaded = await load(animals.id);
    loaded.rename(TagName.create('Mammals'));
    await tags.save(loaded);

    expect((await cards.findActive(user, cat.id))?.tagIds).toEqual([
      animals.id,
    ]);
    expect((await tags.findById(user, animals.id))?.name.value).toBe('Mammals');
  });

  it('TAG-16: a new tag starts at version 0; every save bumps it', async () => {
    const tag = newTag(user, 'Animals');
    await tags.add(tag);
    expect((await load(tag.id)).version).toBe(0);
    await tags.save(await load(tag.id)); // e.g. cards added through the tag
    expect((await load(tag.id)).version).toBe(1);
  });

  it('TAG-16: two saves from the same loaded version → the second fails with TagChanged', async () => {
    const tag = newTag(user, 'Animals');
    await tags.add(tag);
    const phone = await load(tag.id);
    const laptop = await load(tag.id);
    laptop.rename(TagName.create('Mammals'));
    await tags.save(laptop);

    phone.rename(TagName.create('Pets'));
    await expect(tags.save(phone)).rejects.toBeInstanceOf(TagChanged);
    expect((await load(tag.id)).name.value).toBe('Mammals');
  });

  it('TAG-16: deleting from an outdated version fails with TagChanged, the tag stays', async () => {
    const tag = newTag(user, 'Animals');
    await tags.add(tag);
    const stale = await load(tag.id);
    await tags.save(await load(tag.id));

    await expect(tags.delete(stale)).rejects.toBeInstanceOf(TagChanged);
    expect(await tags.findById(user, tag.id)).not.toBeNull();
  });

  it('lockForMerge refuses to run outside a transaction', async () => {
    const tag = newTag(user, 'Animals');
    await tags.add(tag);
    await expect(tags.lockForMerge(user, [tag.id])).rejects.toThrow(
      /inside a transaction/,
    );
  });

  it("CARD-04: findByIds returns only the user's own tags", async () => {
    const mine = newTag(user, 'Animals');
    const alsoMine = newTag(user, 'Dogs');
    const theirs = newTag(newUserId(), 'Animals');
    await tags.add(mine);
    await tags.add(alsoMine);
    await tags.add(theirs);

    const found = await tags.findByIds(user, [mine.id, alsoMine.id, theirs.id]);
    expect(found.map((t) => t.id).sort()).toEqual(
      [mine.id, alsoMine.id].sort(),
    );
  });

  it('TAG-05: findOrInsertByName inserts a new tag', async () => {
    const tag = newTag(user, 'Animals');
    expect(await tags.findOrInsertByName(tag)).toBe(tag);
    expect((await tags.findByName(user, tag.name))?.id).toBe(tag.id);
  });

  it('TAG-03: findOrInsertByName returns the existing tag when another request took the name (ADR-009)', async () => {
    const first = newTag(user, 'Animals');
    await tags.add(first);
    const second = newTag(user, 'Animals');
    const result = await prisma.runInTransaction(() =>
      tags.findOrInsertByName(second),
    );
    expect(result.id).toBe(first.id);
    expect(await prisma.db.tag.count({ where: { userId: user } })).toBe(1);
  });
});
