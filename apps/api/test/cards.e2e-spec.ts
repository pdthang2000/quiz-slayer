import { CardBody, createTestApp, tagNames, tick } from './e2e/test-app';

describe('Cards (e2e)', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => (t = await createTestApp()));
  beforeEach(() => t.reset());
  afterAll(() => t.close());

  describe('create', () => {
    it('TAG-05: unknown tag names are created; existing ones are linked', async () => {
      await t.createCard('Cat', ['Animals']);
      const animals = await t.tagNamed('Animals');
      const dog = await t.createCard('Dog', ['Animals', 'pitbull']);
      expect(tagNames(dog)).toEqual(['Animals', 'pitbull']);
      expect(dog.tags.find((x) => x.name === 'Animals')?.id).toBe(animals?.id);
      expect((await t.tags()).map((x) => x.name)).toEqual([
        'Animals',
        'pitbull',
      ]);
    });

    it('CARDTAG-06: the same tag twice is kept once; names compare after TAG-01, case-sensitive', async () => {
      const card = await t.createCard('Dog', [
        'Animals',
        ' Animals ',
        'animals',
      ]);
      expect(tagNames(card)).toEqual(['Animals', 'animals']);
    });

    it('CARDTAG-03: 21 tags → 422 TooManyTags, and no tag is created', async () => {
      const tags = Array.from({ length: 21 }, (_, i) => `t${i}`);
      const res = await t
        .http()
        .post('/cards')
        .send({ front: 'Dog', back: 'b', tags })
        .expect(422);
      expect(res.body.error).toBe('TooManyTags');
      expect(await t.tags()).toEqual([]);
    });

    it('CARD-01: an empty front → 400 InvalidCardFront (empty)', async () => {
      const res = await t
        .http()
        .post('/cards')
        .send({ front: '  ', back: 'b', tags: [] })
        .expect(400);
      expect(res.body).toMatchObject({
        error: 'InvalidCardFront',
        reason: 'empty',
      });
    });

    it('CARD-02: a back over 3000 characters → 400 InvalidCardBack (tooLong)', async () => {
      const res = await t
        .http()
        .post('/cards')
        .send({ front: 'Dog', back: 'a'.repeat(3001), tags: [] })
        .expect(400);
      expect(res.body).toMatchObject({
        error: 'InvalidCardBack',
        reason: 'tooLong',
      });
    });

    it('TAG-01: an invalid tag name → 400 InvalidTagName, nothing saved', async () => {
      const res = await t
        .http()
        .post('/cards')
        .send({ front: 'Dog', back: 'b', tags: ['ok', 'HSK.1'] })
        .expect(400);
      expect(res.body.error).toBe('InvalidTagName');
      expect(await t.listFronts()).toEqual([]);
      expect(await t.tags()).toEqual([]);
    });

    it('CARDTAG-06: 21 copies of one tag name pass the request guard and count once', async () => {
      const card = await t.createCard('Dog', Array(21).fill('Animals'));
      expect(tagNames(card)).toEqual(['Animals']);
    });

    it('request guard: more than 100 tags in one request → 400 before any use case runs', async () => {
      const tags = Array.from({ length: 101 }, (_, i) => `t${i}`);
      await t
        .http()
        .post('/cards')
        .send({ front: 'Dog', back: 'b', tags })
        .expect(400);
      expect(await t.tags()).toEqual([]);
    });

    it('rejects a malformed request before any use case runs', async () => {
      await t.http().post('/cards').send({ front: 'Dog' }).expect(400);
    });
  });

  describe('edit (CARD-07)', () => {
    it('CARD-07: one Save edits the text, removes and adds tags (creating new ones)', async () => {
      const dog = await t.createCard('Dog', ['pitbull', 'English'], 'a mammal');
      const res = await t
        .http()
        .put(`/cards/${dog.id}`)
        .send({
          front: 'Dog',
          back: 'a mammal that barks',
          tags: ['English', 'Animals'],
          version: dog.version,
        })
        .expect(200);
      const saved = res.body as CardBody;
      expect(saved.back).toBe('a mammal that barks');
      expect(saved.version).toBe(dog.version + 1);
      expect(tagNames(saved)).toEqual(['Animals', 'English']);
      expect((await t.tagNamed('pitbull'))?.cardCount).toBe(0); // TAG-04: kept
    });

    it('CARD-07: a failed Save leaves no new tag behind (ADR-009)', async () => {
      const dog = await t.createCard('Dog');
      await t.trash(dog.id);
      const res = await t
        .http()
        .put(`/cards/${dog.id}`)
        .send({ front: 'Dog', back: 'b', tags: ['Animals'], version: 1 }) // current version
        .expect(409);
      expect(res.body.error).toBe('CardIsTrashed');
      expect(await t.tags()).toEqual([]);
    });

    it('CARD-07: a failed Save with too many tags rolls back the new tags', async () => {
      const dog = await t.createCard('Dog');
      const tags = Array.from({ length: 21 }, (_, i) => `t${i}`);
      await t
        .http()
        .put(`/cards/${dog.id}`)
        .send({ front: 'Dog', back: 'b', tags, version: dog.version })
        .expect(422);
      expect(await t.tags()).toEqual([]);
    });

    it('TRASH-02: editing a trashed card (at its current version) → 409 CardIsTrashed', async () => {
      const dog = await t.createCard('Dog');
      await t.trash(dog.id);
      const res = await t
        .http()
        .put(`/cards/${dog.id}`)
        .send({ front: 'Cat', back: 'b', tags: [], version: 1 })
        .expect(409);
      expect(res.body.error).toBe('CardIsTrashed');
    });

    it('an unknown card → 404 CardNotFound', async () => {
      const res = await t
        .http()
        .put('/cards/00000000-0000-4000-8000-00000000abcd')
        .send({ front: 'Cat', back: 'b', tags: [], version: 0 })
        .expect(404);
      expect(res.body.error).toBe('CardNotFound');
    });

    it('rejects a Save without a version before any use case runs', async () => {
      const dog = await t.createCard('Dog');
      await t
        .http()
        .put(`/cards/${dog.id}`)
        .send({ front: 'Cat', back: 'b', tags: [] })
        .expect(400);
    });
  });

  describe('outdated Save (CARD-08)', () => {
    it('CARD-08: a Save with an old version → 409 CardChanged, card unchanged', async () => {
      const dog = await t.createCard('Dog', ['Animals'], 'a mammal');
      const save = (back: string) =>
        t
          .http()
          .put(`/cards/${dog.id}`)
          .send({
            front: 'Dog',
            back,
            tags: ['Animals'],
            version: dog.version,
          });
      await save('saved on the laptop').expect(200);

      const res = await save('saved on the phone').expect(409);
      expect(res.body.error).toBe('CardChanged');
      const stored = (await t.http().get(`/cards/${dog.id}`).expect(200))
        .body as CardBody;
      expect(stored.back).toBe('saved on the laptop');
      expect(stored.version).toBe(1);
    });

    it('CARD-08: trashed on the laptop, Save on the phone → 409 CardChanged, card stays in the Trash', async () => {
      const dog = await t.createCard('Dog', ['Animals']); // phone opens the editor
      await t.trash(dog.id); // laptop
      const res = await t
        .http()
        .put(`/cards/${dog.id}`)
        .send({
          front: 'Dog!',
          back: 'b',
          tags: ['Animals', 'pitbull'],
          version: dog.version,
        })
        .expect(409);
      expect(res.body.error).toBe('CardChanged');
      const trash = (await t.http().get('/trash').expect(200)).body as {
        items: CardBody[];
      };
      expect(trash.items.map((c) => c.front)).toEqual(['Dog']);
      expect(await t.tagNamed('pitbull')).toBeUndefined(); // ADR-009: rolled back
    });
  });

  describe('reads', () => {
    it('READ-01: card detail does not return a trashed card', async () => {
      const dog = await t.createCard('Dog');
      await t.trash(dog.id);
      const res = await t.http().get(`/cards/${dog.id}`).expect(404);
      expect(res.body.error).toBe('CardNotFound');
    });

    it('READ-01: the card list does not return a trashed card', async () => {
      const dog = await t.createCard('Dog');
      await t.createCard('Cat');
      await t.trash(dog.id);
      expect(await t.listFronts()).toEqual(['Cat']);
    });

    it('READ-01: search does not return a trashed card', async () => {
      const dog = await t.createCard('Dog');
      await t.createCard('Doge');
      await t.trash(dog.id);
      expect(await t.listFronts('?q=dog')).toEqual(['Doge']);
    });

    it('READ-01: cards-in-tag does not return a trashed card', async () => {
      const dog = await t.createCard('Dog', ['Animals']);
      await t.createCard('Cat', ['Animals']);
      await t.trash(dog.id);
      const animals = await t.tagNamed('Animals');
      expect(await t.listFronts(`?tag=${animals?.id}`)).toEqual(['Cat']);
    });

    it('TRASH-03: a trashed card is not counted in the tag card count', async () => {
      const dog = await t.createCard('Dog', ['Animals']);
      await t.createCard('Cat', ['Animals']);
      await t.trash(dog.id);
      expect((await t.tagNamed('Animals'))?.cardCount).toBe(1);
    });

    it('READ-06: the tags on a card are A–Z, in the same order as the Tag list (READ-04)', async () => {
      const names = [
        'pitbull',
        'Animals',
        'động vật',
        'apple',
        '动物',
        'animals',
        'HSK1',
      ];
      const card = await t.createCard('Dog', names);
      const expected = [
        'animals',
        'Animals',
        'apple',
        'động vật',
        'HSK1',
        'pitbull',
        '动物',
      ];
      expect(card.tags.map((x) => x.name)).toEqual(expected);
      expect((await t.tags()).map((x) => x.name)).toEqual(expected);
    });

    it('READ-02: newest created first, 20 at a time, "load more" with the cursor', async () => {
      for (let i = 1; i <= 25; i++) {
        await t.createCard(`Card ${i}`);
        await tick();
      }
      const first = await t.http().get('/cards').expect(200);
      expect(first.body.items).toHaveLength(20);
      expect(first.body.items[0].front).toBe('Card 25');
      expect(first.body.nextCursor).toEqual(expect.any(String));

      const second = await t
        .http()
        .get(`/cards?cursor=${first.body.nextCursor}`)
        .expect(200);
      expect((second.body.items as CardBody[]).map((c) => c.front)).toEqual([
        'Card 5',
        'Card 4',
        'Card 3',
        'Card 2',
        'Card 1',
      ]);
      expect(second.body.nextCursor).toBeNull();
    });

    it('READ-03: search matches any part of front or back, ignoring case and accents', async () => {
      await t.createCard('Dog', [], 'a mammal that barks');
      await t.createCard('động vật', [], 'animal');
      await t.createCard('Cat', [], 'meows');
      expect(await t.listFronts('?q=dog')).toEqual(['Dog']);
      expect(await t.listFronts('?q=BARK')).toEqual(['Dog']);
      expect(
        await t.listFronts(`?q=${encodeURIComponent('dong vat')}`),
      ).toEqual(['động vật']);
    });

    it('READ-03: search does not look at tag names, and % is matched literally', async () => {
      await t.createCard('Dog', ['Animals']);
      await t.createCard('100% sure');
      expect(await t.listFronts('?q=animals')).toEqual([]);
      expect(await t.listFronts(`?q=${encodeURIComponent('%')}`)).toEqual([
        '100% sure',
      ]);
    });

    it('READ-05: several tag chips show cards with all of them, combined with search', async () => {
      await t.createCard('你好', ['HSK1', 'greeting']);
      await t.createCard('谢谢', ['HSK1']);
      await t.createCard('Hello', ['greeting']);
      const hsk1 = await t.tagNamed('HSK1');
      const greeting = await t.tagNamed('greeting');
      expect(
        await t.listFronts(`?tag=${hsk1?.id}&tag=${greeting?.id}`),
      ).toEqual(['你好']);
      expect((await t.listFronts(`?tag=${hsk1?.id}`)).sort()).toEqual(
        ['你好', '谢谢'].sort(),
      );
      expect(
        await t.listFronts(`?tag=${hsk1?.id}&q=${encodeURIComponent('谢')}`),
      ).toEqual(['谢谢']);
    });

    it('a malformed cursor → 400', async () => {
      await t.http().get('/cards?cursor=abc').expect(400);
    });
  });
});
