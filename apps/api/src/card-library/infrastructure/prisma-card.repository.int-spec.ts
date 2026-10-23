import { connectTestDb, resetDb } from '../../../test/int/db';
import { Prisma } from '@prisma/client';
import { CardBack, CardFront } from '../domain/card-text';
import { TagNoLongerExists } from '../domain/errors';
import { PrismaCardRepository } from './prisma-card.repository';
import { PrismaTagRepository } from './prisma-tag.repository';
import { newCard, newTag, newUserId } from './fixtures.int';

const prisma = connectTestDb();
const cards = new PrismaCardRepository(prisma);
const tags = new PrismaTagRepository(prisma);
const user = newUserId();

beforeEach(() => resetDb(prisma));
afterAll(() => prisma.onModuleDestroy());

describe('PrismaCardRepository', () => {
  it('saves and loads a card with its tags', async () => {
    const animals = newTag(user, 'Animals');
    const pitbull = newTag(user, 'pitbull');
    await tags.save(animals);
    await tags.save(pitbull);
    const dog = newCard(user, 'Dog', [animals, pitbull], 'a mammal that barks');
    await cards.save(dog);

    const loaded = await cards.findActive(user, dog.id);
    expect(loaded?.front.value).toBe('Dog');
    expect(loaded?.back.value).toBe('a mammal that barks');
    expect(loaded?.state).toBe('Active');
    expect(loaded?.tagIds.sort()).toEqual([animals.id, pitbull.id].sort());
    expect(loaded?.pullEvents()).toEqual([]);
  });

  it('saving again updates the card and its CardTags', async () => {
    const animals = newTag(user, 'Animals');
    const pitbull = newTag(user, 'pitbull');
    await tags.save(animals);
    await tags.save(pitbull);
    const dog = newCard(user, 'Dog', [animals]);
    await cards.save(dog);

    dog.edit(CardFront.create('Dog!'), CardBack.create('barks'));
    dog.removeTag(animals.id);
    dog.addTag(pitbull.id);
    await cards.save(dog);

    const loaded = await cards.findActive(user, dog.id);
    expect(loaded?.front.value).toBe('Dog!');
    expect(loaded?.tagIds).toEqual([pitbull.id]);
  });

  it('READ-01: findActive does not return a trashed card', async () => {
    const dog = newCard(user, 'Dog');
    dog.moveToTrash();
    await cards.save(dog);
    expect(await cards.findActive(user, dog.id)).toBeNull();
  });

  it('READ-01: findTrashed does not return an active card', async () => {
    const dog = newCard(user, 'Dog');
    await cards.save(dog);
    expect(await cards.findTrashed(user, dog.id)).toBeNull();
  });

  it("CARD-04: another user's card is not returned", async () => {
    const dog = newCard(user, 'Dog');
    await cards.save(dog);
    const trashed = newCard(user, 'Cat');
    trashed.moveToTrash();
    await cards.save(trashed);

    const other = newUserId();
    expect(await cards.findActive(other, dog.id)).toBeNull();
    expect(await cards.findTrashed(other, trashed.id)).toBeNull();
    expect(await cards.findByTag(other, newTag(user, 'x').id)).toEqual([]);
  });

  it('TRASH-04: restore brings the tags back', async () => {
    const hsk1 = newTag(user, 'HSK1');
    const greeting = newTag(user, 'greeting');
    await tags.save(hsk1);
    await tags.save(greeting);
    const nihao = newCard(user, '你好', [hsk1, greeting]);
    await cards.save(nihao);

    nihao.moveToTrash();
    await cards.save(nihao);
    const trashed = await cards.findTrashed(user, nihao.id);
    expect(trashed?.tagIds.sort()).toEqual([hsk1.id, greeting.id].sort());

    trashed!.restore();
    await cards.save(trashed!);
    const restored = await cards.findActive(user, nihao.id);
    expect(restored?.tagIds.sort()).toEqual([hsk1.id, greeting.id].sort());
  });

  it('TRASH-06: a tag deleted while the card was trashed is gone after restore', async () => {
    const hsk1 = newTag(user, 'HSK1');
    const greeting = newTag(user, 'greeting');
    await tags.save(hsk1);
    await tags.save(greeting);
    const nihao = newCard(user, '你好', [hsk1, greeting]);
    nihao.moveToTrash();
    await cards.save(nihao);

    await tags.delete(greeting);

    const trashed = await cards.findTrashed(user, nihao.id);
    trashed!.restore();
    await cards.save(trashed!);
    expect((await cards.findActive(user, nihao.id))?.tagIds).toEqual([hsk1.id]);
  });

  it('TRASH-05: deleting permanently removes the card and its CardTags', async () => {
    const hsk1 = newTag(user, 'HSK1');
    await tags.save(hsk1);
    const nihao = newCard(user, '你好', [hsk1]);
    nihao.moveToTrash();
    await cards.save(nihao);

    nihao.deletePermanently();
    await cards.delete(nihao);

    expect(await cards.findTrashed(user, nihao.id)).toBeNull();
    expect(await prisma.db.cardTag.count({ where: { cardId: nihao.id } })).toBe(
      0,
    );
    expect(await tags.findById(user, hsk1.id)).not.toBeNull();
  });

  it('CARDTAG-01: removing a tag from a card deletes only that CardTag', async () => {
    const animals = newTag(user, 'Animals');
    await tags.save(animals);
    const dog = newCard(user, 'Dog', [animals]);
    const cat = newCard(user, 'Cat', [animals]);
    await cards.save(dog);
    await cards.save(cat);

    dog.removeTag(animals.id);
    await cards.save(dog);

    expect((await cards.findActive(user, cat.id))?.tagIds).toEqual([
      animals.id,
    ]);
    expect(await tags.findById(user, animals.id)).not.toBeNull();
  });

  it('TAG-04: a tag with 0 cards is kept', async () => {
    const animals = newTag(user, 'Animals');
    await tags.save(animals);
    const dog = newCard(user, 'Dog', [animals]);
    await cards.save(dog);

    dog.removeTag(animals.id);
    await cards.save(dog);

    expect(await tags.findById(user, animals.id)).not.toBeNull();
  });

  it('TAG-09: findByTag returns Active and Trashed cards with the tag', async () => {
    const pitbull = newTag(user, 'pitbull');
    const other = newTag(user, 'other');
    await tags.save(pitbull);
    await tags.save(other);
    const dog = newCard(user, 'Dog', [pitbull]);
    const rex = newCard(user, 'Rex', [pitbull]);
    rex.moveToTrash();
    const cat = newCard(user, 'Cat', [other]);
    await cards.saveAll([dog, rex, cat]);

    const found = await cards.findByTag(user, pitbull.id);
    expect(found.map((c) => c.front.value).sort()).toEqual(['Dog', 'Rex']);
  });

  it("CARD-04: a card cannot be linked to another user's tag", async () => {
    const theirs = newTag(newUserId(), 'Animals');
    await tags.save(theirs);
    const dog = newCard(user, 'Dog');
    await cards.save(dog);

    // The DB backstop (C-22): the composite foreign key rejects the row.
    await expect(
      prisma.db.cardTag.create({
        data: { cardId: dog.id, tagId: theirs.id, userId: user },
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);

    // Through the repository it surfaces as TagNoLongerExists (C-21 error table).
    dog.addTag(theirs.id);
    await expect(cards.save(dog)).rejects.toBeInstanceOf(TagNoLongerExists);
    expect((await cards.findActive(user, dog.id))?.tagIds).toEqual([]);
  });

  it('C-21: saving a card with a deleted tag throws TagNoLongerExists', async () => {
    const animals = newTag(user, 'Animals');
    await tags.save(animals);
    const dog = newCard(user, 'Dog');
    dog.addTag(animals.id);
    await tags.delete(animals);
    await expect(cards.save(dog)).rejects.toBeInstanceOf(TagNoLongerExists);
  });

  it('saveAll writes many cards and their CardTags', async () => {
    const animals = newTag(user, 'Animals');
    await tags.save(animals);
    const many = Array.from({ length: 50 }, (_, i) =>
      newCard(user, `Card ${i}`, i % 2 === 0 ? [animals] : []),
    );
    await cards.saveAll(many);
    expect(
      await prisma.db.cardTag.count({ where: { tagId: animals.id } }),
    ).toBe(25);
  });
});
