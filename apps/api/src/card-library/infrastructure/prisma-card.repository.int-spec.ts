import { connectTestDb, resetDb } from '../../../test/int/db';
import { Prisma } from '@prisma/client';
import { Card } from '../domain/card';
import { CardBack, CardFront } from '../domain/card-text';
import { CardChanged, TagNoLongerExists } from '../domain/errors';
import { PrismaCardRepository } from './prisma-card.repository';
import { PrismaTagRepository } from './prisma-tag.repository';
import { newCard, newTag, newUserId } from './fixtures.int';

const prisma = connectTestDb();
const cards = new PrismaCardRepository(prisma);
const tags = new PrismaTagRepository(prisma);
const user = newUserId();

beforeEach(() => resetDb(prisma));
afterAll(() => prisma.onModuleDestroy());

/** A loaded card is saved once (CARD-08); load it again for the next change. */
const loadActive = async (id: Card['id']) =>
  (await cards.findActive(user, id))!;

describe('PrismaCardRepository', () => {
  it('saves and loads a card with its tags', async () => {
    const animals = newTag(user, 'Animals');
    const pitbull = newTag(user, 'pitbull');
    await tags.save(animals);
    await tags.save(pitbull);
    const dog = newCard(user, 'Dog', [animals, pitbull], 'a mammal that barks');
    await cards.add(dog);

    const loaded = await cards.findActive(user, dog.id);
    expect(loaded?.front.value).toBe('Dog');
    expect(loaded?.back.value).toBe('a mammal that barks');
    expect(loaded?.state).toBe('Active');
    expect(loaded?.version).toBe(0);
    expect(loaded?.tagIds.sort()).toEqual([animals.id, pitbull.id].sort());
    expect(loaded?.pullEvents()).toEqual([]);
  });

  it('saving again updates the card and its CardTags', async () => {
    const animals = newTag(user, 'Animals');
    const pitbull = newTag(user, 'pitbull');
    await tags.save(animals);
    await tags.save(pitbull);
    const dog = newCard(user, 'Dog', [animals]);
    await cards.add(dog);

    const edited = await loadActive(dog.id);
    edited.edit(CardFront.create('Dog!'), CardBack.create('barks'));
    edited.removeTag(animals.id);
    edited.addTag(pitbull.id);
    await cards.save(edited);

    const loaded = await cards.findActive(user, dog.id);
    expect(loaded?.front.value).toBe('Dog!');
    expect(loaded?.tagIds).toEqual([pitbull.id]);
    expect(loaded?.version).toBe(1);
  });

  it('READ-01: findActive does not return a trashed card', async () => {
    const dog = newCard(user, 'Dog');
    dog.moveToTrash(new Date());
    await cards.add(dog);
    expect(await cards.findActive(user, dog.id)).toBeNull();
  });

  it('READ-01: findTrashed does not return an active card', async () => {
    const dog = newCard(user, 'Dog');
    await cards.add(dog);
    expect(await cards.findTrashed(user, dog.id)).toBeNull();
  });

  it("CARD-04: another user's card is not returned", async () => {
    const dog = newCard(user, 'Dog');
    await cards.add(dog);
    const trashed = newCard(user, 'Cat');
    trashed.moveToTrash(new Date());
    await cards.add(trashed);

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
    await cards.add(nihao);

    const active = await loadActive(nihao.id);
    active.moveToTrash(new Date());
    await cards.save(active);
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
    nihao.moveToTrash(new Date());
    await cards.add(nihao);

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
    nihao.moveToTrash(new Date());
    await cards.add(nihao);

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
    await cards.addAll([dog, cat]);

    const loaded = await loadActive(dog.id);
    loaded.removeTag(animals.id);
    await cards.save(loaded);

    expect((await cards.findActive(user, cat.id))?.tagIds).toEqual([
      animals.id,
    ]);
    expect(await tags.findById(user, animals.id)).not.toBeNull();
  });

  it('TAG-04: a tag with 0 cards is kept', async () => {
    const animals = newTag(user, 'Animals');
    await tags.save(animals);
    const dog = newCard(user, 'Dog', [animals]);
    await cards.add(dog);

    const loaded = await loadActive(dog.id);
    loaded.removeTag(animals.id);
    await cards.save(loaded);

    expect(await tags.findById(user, animals.id)).not.toBeNull();
  });

  it('TAG-09: findByTag returns Active and Trashed cards with the tag', async () => {
    const pitbull = newTag(user, 'pitbull');
    const other = newTag(user, 'other');
    await tags.save(pitbull);
    await tags.save(other);
    const dog = newCard(user, 'Dog', [pitbull]);
    const rex = newCard(user, 'Rex', [pitbull]);
    rex.moveToTrash(new Date());
    const cat = newCard(user, 'Cat', [other]);
    await cards.addAll([dog, rex, cat]);

    const found = await cards.findByTag(user, pitbull.id);
    expect(found.map((c) => c.front.value).sort()).toEqual(['Dog', 'Rex']);
  });

  it("CARD-04: a card cannot be linked to another user's tag", async () => {
    const theirs = newTag(newUserId(), 'Animals');
    await tags.save(theirs);
    const dog = newCard(user, 'Dog');
    await cards.add(dog);

    // The DB backstop (C-22): the composite foreign key rejects the row.
    await expect(
      prisma.db.cardTag.create({
        data: { cardId: dog.id, tagId: theirs.id, userId: user },
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);

    // Through the repository it surfaces as TagNoLongerExists (C-21 error table).
    const loaded = await loadActive(dog.id);
    loaded.addTag(theirs.id);
    await expect(cards.save(loaded)).rejects.toBeInstanceOf(TagNoLongerExists);
    expect((await cards.findActive(user, dog.id))?.tagIds).toEqual([]);
  });

  it('C-21: saving a card with a deleted tag throws TagNoLongerExists', async () => {
    const animals = newTag(user, 'Animals');
    await tags.save(animals);
    const dog = newCard(user, 'Dog');
    dog.addTag(animals.id);
    await tags.delete(animals);
    await expect(cards.add(dog)).rejects.toBeInstanceOf(TagNoLongerExists);
  });

  it('addAll writes many cards and their CardTags', async () => {
    const animals = newTag(user, 'Animals');
    await tags.save(animals);
    const many = Array.from({ length: 50 }, (_, i) =>
      newCard(user, `Card ${i}`, i % 2 === 0 ? [animals] : []),
    );
    await cards.addAll(many);
    expect(
      await prisma.db.cardTag.count({ where: { tagId: animals.id } }),
    ).toBe(25);
  });

  it('TRASH-12: trashedAt is stored, and cleared on restore', async () => {
    const dog = newCard(user, 'Dog');
    const at = new Date('2026-10-23T10:00:00.123Z');
    dog.moveToTrash(at);
    await cards.add(dog);
    const trashed = await cards.findTrashed(user, dog.id);
    expect(trashed?.trashedAt).toEqual(at);
    trashed!.restore();
    await cards.save(trashed!);
    expect((await cards.findActive(user, dog.id))?.trashedAt).toBeNull();
  });

  it('TRASH-09: deleteAll skips a card that was restored meanwhile', async () => {
    const dog = newCard(user, 'Dog');
    dog.moveToTrash(new Date());
    await cards.add(dog);
    const stale = await cards.findTrashed(user, dog.id); // loaded for empty trash
    const fresh = await cards.findTrashed(user, dog.id);
    fresh!.restore(); // another device restores it
    await cards.save(fresh!);

    stale!.deletePermanently();
    await cards.deleteAll([stale!]);
    expect(await cards.findActive(user, dog.id)).not.toBeNull();
  });

  it('TRASH-11: listTrashed returns only trashed cards of the user', async () => {
    const dog = newCard(user, 'Dog');
    dog.moveToTrash(new Date());
    const cat = newCard(user, 'Cat');
    const theirs = newCard(newUserId(), 'Fish');
    theirs.moveToTrash(new Date());
    await cards.addAll([dog, cat]);
    await cards.add(theirs);
    expect((await cards.listTrashed(user)).map((c) => c.id)).toEqual([dog.id]);
  });

  it('CARD-08: two saves from the same loaded version → the second fails with CardChanged', async () => {
    const dog = newCard(user, 'Dog');
    await cards.add(dog);
    const phone = await loadActive(dog.id);
    const laptop = await loadActive(dog.id);

    laptop.moveToTrash(new Date());
    await cards.save(laptop);
    phone.edit(CardFront.create('Dog!'), CardBack.create('barks'));
    await expect(cards.save(phone)).rejects.toBeInstanceOf(CardChanged);

    const stored = await cards.findTrashed(user, dog.id);
    expect(stored?.front.value).toBe('Dog');
    expect(stored?.version).toBe(1);
  });

  it('CARD-08: a failed saveAll writes nothing (no card, no CardTag)', async () => {
    const animals = newTag(user, 'Animals');
    await tags.save(animals);
    const dog = newCard(user, 'Dog');
    const cat = newCard(user, 'Cat');
    await cards.addAll([dog, cat]);
    const staleCat = await loadActive(cat.id);
    const other = await loadActive(cat.id);
    other.edit(CardFront.create('Cat!'), CardBack.create('meows'));
    await cards.save(other);

    const freshDog = await loadActive(dog.id);
    freshDog.addTag(animals.id);
    staleCat.addTag(animals.id);
    await expect(cards.saveAll([freshDog, staleCat])).rejects.toBeInstanceOf(
      CardChanged,
    );
    expect((await loadActive(dog.id)).version).toBe(0);
    expect(await prisma.db.cardTag.count()).toBe(0);
  });
});
