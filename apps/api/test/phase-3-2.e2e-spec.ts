import {
  CardBody,
  createTestApp,
  TagWithCount,
  tagNames,
  tick,
  ifMatch,
} from './e2e/test-app';

type Page<T> = { items: T[]; nextCursor: string | null };
type PickerCard = CardBody & { atTagLimit: boolean };
type MembershipResult = {
  tag: { id: string; version: number };
  cards: { id: string; version: number }[];
};

describe('Phase 3.2 (e2e): conflicts, tag card lists, Study, card tags', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => (t = await createTestApp()));
  beforeEach(() => t.reset());
  afterAll(() => t.close());

  /** The tag list screen: If-Match = the tag version it showed (C-46), card versions in the body. */
  type Shown = { id: string; version: number };
  const membershipBody = (cards: Shown[]) => ({
    cards: cards.map((c) => ({ cardId: c.id, version: c.version })),
  });
  const addCards = (tag: Shown, cards: Shown[]) =>
    t
      .http()
      .post(`/tags/${tag.id}/cards`)
      .set('If-Match', ifMatch(tag.version))
      .send(membershipBody(cards));
  const removeCards = (tag: Shown, cards: Shown[]) =>
    t
      .http()
      .post(`/tags/${tag.id}/cards/remove`)
      .set('If-Match', ifMatch(tag.version))
      .send(membershipBody(cards));
  const card = async (id: string) =>
    (await t.http().get(`/cards/${id}`).expect(200)).body as CardBody;

  describe('CONFLICT-01: every action from an outdated view → 409, nothing changes', () => {
    /** Phone shows Rex at its first version; then the laptop edits Rex. */
    async function rexEditedElsewhere() {
      const shown = await t.createCard('Rex', ['Dog']);
      await t
        .http()
        .put(`/cards/${shown.id}`)
        .set('If-Match', ifMatch(shown.version))
        .send({ front: 'Rex!', back: 'back', tags: ['Dog'] })
        .expect(200);
      return shown;
    }

    it('CONFLICT-01: Save (CARD-08)', async () => {
      const shown = await rexEditedElsewhere();
      const res = await t
        .http()
        .put(`/cards/${shown.id}`)
        .set('If-Match', ifMatch(shown.version))
        .send({ front: 'Phone', back: 'b', tags: [] })
        .expect(409);
      expect(res.body.error).toBe('CardChanged');
      expect((await card(shown.id)).front).toBe('Rex!');
    });

    it('CONFLICT-01: move to trash (CARD-08)', async () => {
      const shown = await rexEditedElsewhere();
      const res = await t
        .http()
        .post(`/cards/${shown.id}/trash`)
        .set('If-Match', ifMatch(shown.version))
        .expect(409);
      expect(res.body.error).toBe('CardChanged');
      expect(await t.listFronts()).toEqual(['Rex!']);
    });

    it('CONFLICT-01: restore (CARD-08)', async () => {
      const dog = await t.createCard('Dog');
      const trashed = await t.trash(dog.id); // the Trash screen shows this version
      await t.restore(dog.id); // laptop restores …
      await t.trash(dog.id); // … and trashes it again
      const res = await t
        .http()
        .post(`/trash/${dog.id}/restore`)
        .set('If-Match', ifMatch(trashed.version))
        .expect(409);
      expect(res.body.error).toBe('CardChanged');
      expect((await t.trashPage()).total).toBe(1);
    });

    it('CONFLICT-01: delete permanently (CARD-08)', async () => {
      const dog = await t.createCard('Dog');
      const trashed = await t.trash(dog.id);
      await t.restore(dog.id);
      await t.trash(dog.id);
      const res = await t
        .http()
        .delete(`/trash/${dog.id}`)
        .set('If-Match', ifMatch(trashed.version))
        .expect(409);
      expect(res.body.error).toBe('CardChanged');
      expect((await t.trashPage()).total).toBe(1);
    });

    it('CONFLICT-01: remove from a tag (CARD-08)', async () => {
      const shown = await rexEditedElsewhere();
      const dogTag = (await t.tagNamed('Dog'))!;
      const res = await removeCards(dogTag, [shown]).expect(409);
      expect(res.body.error).toBe('CardChanged');
      expect(tagNames(await card(shown.id))).toEqual(['Dog']);
    });

    it('CONFLICT-01: add to a tag (CARD-08)', async () => {
      const shown = await rexEditedElsewhere();
      await t.createCard('Other', ['Cat']);
      const cat = (await t.tagNamed('Cat'))!;
      const res = await addCards(cat, [shown]).expect(409);
      expect(res.body.error).toBe('CardChanged');
      expect(tagNames(await card(shown.id))).toEqual(['Dog']);
    });

    it('CONFLICT-01: rename a tag (TAG-16)', async () => {
      await t.createCard('Rex', ['Dog']);
      const shown = (await t.tagNamed('Dog'))!;
      await t.renameTag('Dog', 'Dogs'); // laptop
      const res = await t
        .http()
        .patch(`/tags/${shown.id}`)
        .set('If-Match', ifMatch(shown.version))
        .send({ name: 'Hounds' })
        .expect(409);
      expect(res.body.error).toBe('TagChanged');
      expect((await t.tags()).map((x) => x.name)).toEqual(['Dogs']);
    });

    it('CONFLICT-01: delete a tag (TAG-16)', async () => {
      await t.createCard('Rex', ['Dog']);
      const shown = (await t.tagNamed('Dog'))!;
      await t.renameTag('Dog', 'Dogs');
      const res = await t
        .http()
        .delete(`/tags/${shown.id}`)
        .set('If-Match', ifMatch(shown.version))
        .expect(409);
      expect(res.body.error).toBe('TagChanged');
      expect(await t.tagNamed('Dogs')).toBeDefined();
    });

    it('CONFLICT-01: empty trash (TRASH-11)', async () => {
      await t.trash((await t.createCard('A')).id);
      const dialog = await t.trashPage();
      await tick();
      await t.trash((await t.createCard('B')).id);
      const res = await t
        .http()
        .post('/trash/empty')
        .send({
          expectedCount: dialog.total,
          newestTrashedAt: dialog.newestTrashedAt,
        })
        .expect(409);
      expect(res.body.error).toBe('TrashChanged');
      expect((await t.trashPage()).total).toBe(2);
    });

    it('CONFLICT-01: every successful card change returns the new version', async () => {
      const dog = await t.createCard('Dog');
      expect(dog.version).toBe(0);
      const trashed = await t.trash(dog.id);
      expect(trashed).toEqual({ id: dog.id, version: 1 });
      const restored = await t.restore(dog.id);
      expect(restored).toEqual({ id: dog.id, version: 2 });
      const edited = await t
        .http()
        .put(`/cards/${dog.id}`)
        .set('If-Match', ifMatch(2))
        .send({ front: 'Dog!', back: 'b', tags: [] })
        .expect(200);
      expect((edited.body as CardBody).version).toBe(3);
    });
  });

  describe('TAG-16: tag versions', () => {
    it('TAG-16: delete after cards were added elsewhere → 409 TagChanged; the fresh count then deletes', async () => {
      for (const f of ['Rex', 'Max', 'Fido']) await t.createCard(f, ['Dog']);
      const dialog = (await t.tagNamed('Dog'))!; // "Delete #Dog? It's on 3 cards."
      expect(dialog.cardCount).toBe(3);

      const more = [];
      for (let i = 0; i < 10; i++) more.push(await t.createCard(`Pup ${i}`));
      await addCards(dialog, more).expect(200); // laptop

      const res = await t
        .http()
        .delete(`/tags/${dialog.id}`)
        .set('If-Match', ifMatch(dialog.version))
        .expect(409);
      expect(res.body.error).toBe('TagChanged');
      const fresh = (await t.tagNamed('Dog'))!;
      expect(fresh.cardCount).toBe(13);
      await t
        .http()
        .delete(`/tags/${fresh.id}`)
        .set('If-Match', ifMatch(fresh.version))
        .expect(204);
    });

    it('TAG-16: tag versions are in the tag list and on cards; cards added or removed through the tag bump it', async () => {
      const rex = await t.createCard('Rex', ['Dog']);
      const before = (await t.tagNamed('Dog'))!;
      expect(before.version).toBe(1); // createCard gave it a card (TAG-16)
      expect(rex.tags[0].version).toBe(1);
      const res = await removeCards(before, [rex]).expect(200);
      expect((res.body as MembershipResult).tag).toEqual({
        id: before.id,
        version: 2,
      });
      expect((await t.tagNamed('Dog'))!.version).toBe(2);
    });
  });

  describe('CARDTAG-07 / CARDTAG-08: a tag card list', () => {
    it('CARDTAG-07: removes only this tag from the listed cards and returns the new versions', async () => {
      const rex = await t.createCard('Rex', ['Dog', 'pet']);
      const max = await t.createCard('Max', ['Dog']);
      const fido = await t.createCard('Fido', ['Dog']);
      const dog = (await t.tagNamed('Dog'))!;

      const res = await removeCards(dog, [rex, fido]).expect(200);
      expect((res.body as MembershipResult).cards).toEqual([
        { id: rex.id, version: 1 },
        { id: fido.id, version: 1 },
      ]);
      expect(tagNames(await card(rex.id))).toEqual(['pet']); // CARDTAG-01
      expect(tagNames(await card(max.id))).toEqual(['Dog']);
      expect((await t.tagNamed('Dog'))?.cardCount).toBe(1);
    });

    it('CARDTAG-07: bulk remove is all or nothing — one changed card → 409, no card changes', async () => {
      const rex = await t.createCard('Rex', ['Dog']);
      const max = await t.createCard('Max', ['Dog']);
      const dog = (await t.tagNamed('Dog'))!;
      await t
        .http()
        .put(`/cards/${max.id}`)
        .set('If-Match', ifMatch(max.version))
        .send({ front: 'Max!', back: 'back', tags: ['Dog'] })
        .expect(200); // laptop

      const res = await removeCards(dog, [rex, max]).expect(409);
      expect(res.body.error).toBe('CardChanged');
      expect(tagNames(await card(rex.id))).toEqual(['Dog']);
      expect(await t.tagNamed('Dog')).toMatchObject({
        cardCount: 2,
        version: dog.version, // unchanged
      });
    });

    it('CARDTAG-07: Undo puts them back with the returned versions', async () => {
      const rex = await t.createCard('Rex', ['Dog']);
      const dog = (await t.tagNamed('Dog'))!;
      const removed = (await removeCards(dog, [rex]).expect(200))
        .body as MembershipResult;
      await addCards(removed.tag, removed.cards).expect(200);
      expect(tagNames(await card(rex.id))).toEqual(['Dog']);
    });

    it('CARDTAG-08: adds the tag to the listed cards (all or nothing)', async () => {
      await t.createCard('Rex', ['Dog']);
      const max = await t.createCard('Max');
      const fido = await t.createCard('Fido', ['pet']);
      const dog = (await t.tagNamed('Dog'))!;
      await addCards(dog, [max, fido]).expect(200);
      expect((await t.tagNamed('Dog'))?.cardCount).toBe(3);
      expect(tagNames(await card(fido.id))).toEqual(['Dog', 'pet']);
    });

    it('CARDTAG-08: one full card → 422 TooManyTags naming it, nothing added', async () => {
      await t.createCard('Rex', ['Dog']);
      const max = await t.createCard('Max');
      const full = await t.createCard(
        'Full',
        Array.from({ length: 20 }, (_, i) => `t${i}`),
      );
      const dog = (await t.tagNamed('Dog'))!;

      const res = await addCards(dog, [max, full]).expect(422);
      expect(res.body).toMatchObject({ error: 'TooManyTags', cardId: full.id });
      expect(tagNames(await card(max.id))).toEqual([]);
      expect(await t.tagNamed('Dog')).toMatchObject({
        cardCount: 1,
        version: dog.version, // unchanged
      });
    });

    it('CARDTAG-08: a trashed card → 409 CardIsTrashed, nothing added', async () => {
      await t.createCard('Rex', ['Dog']);
      const old = await t.createCard('Old');
      const { version } = await t.trash(old.id);
      const dog = (await t.tagNamed('Dog'))!;
      const res = await addCards(dog, [{ id: old.id, version }]).expect(409);
      expect(res.body.error).toBe('CardIsTrashed');
    });

    it('CARDTAG-08: the picker lists Active cards not in the tag, newest first, with search, marking full cards', async () => {
      await t.createCard('Rex', ['Dog']);
      await t.createCard('Max dog');
      await tick();
      await t.createCard(
        'Full dog',
        Array.from({ length: 20 }, (_, i) => `t${i}`),
      );
      await tick();
      const old = await t.createCard('Old dog');
      await t.trash(old.id);
      await t.createCard('Cat');
      const dog = (await t.tagNamed('Dog'))!;

      const page = (
        await t.http().get(`/tags/${dog.id}/cards-to-add?q=DOG`).expect(200)
      ).body as Page<PickerCard>;
      expect(page.items.map((c) => [c.front, c.atTagLimit])).toEqual([
        ['Full dog', true],
        ['Max dog', false],
      ]);
    });

    it('CARDTAG-08: the picker pages 20 at a time', async () => {
      await t.createCard('Rex', ['Dog']);
      for (let i = 0; i < 21; i++) await t.createCard(`Card ${i}`);
      const dog = (await t.tagNamed('Dog'))!;
      const first = (
        await t.http().get(`/tags/${dog.id}/cards-to-add`).expect(200)
      ).body as Page<PickerCard>;
      expect(first.items).toHaveLength(20);
      const second = (
        await t
          .http()
          .get(`/tags/${dog.id}/cards-to-add?cursor=${first.nextCursor}`)
          .expect(200)
      ).body as Page<PickerCard>;
      expect(second.items).toHaveLength(1);
      expect(second.nextCursor).toBeNull();
    });

    it('CARDTAG-07: more than 100 cards in one action → 400 before any use case runs', async () => {
      await t.createCard('Rex', ['Dog']);
      const dog = (await t.tagNamed('Dog'))!;
      const many = Array.from({ length: 101 }, () => ({
        id: '00000000-0000-4000-8000-000000000abc',
        version: 0,
      }));
      await removeCards(dog, many).expect(400);
      await addCards(dog, many).expect(400);
    });
  });

  describe('Study', () => {
    it('STUDY-01: study ids follow the list filter (tags AND search); nothing selected → all Active cards', async () => {
      const hello = await t.createCard('Hello', ['HSK1', 'greeting']);
      await t.createCard('Bye', ['HSK1']);
      await t.createCard('Cat', ['animals']);
      const old = await t.createCard('Old', ['HSK1', 'greeting']);
      await t.trash(old.id);
      const tags = await t.tags();
      const id = (name: string) => tags.find((x) => x.name === name)!.id;

      const filtered = await t
        .http()
        .get(`/cards/study-ids?tag=${id('HSK1')}&tag=${id('greeting')}&q=hel`)
        .expect(200);
      expect(filtered.body).toEqual({ ids: [hello.id] });
      const all = await t.http().get('/cards/study-ids').expect(200);
      expect((all.body as { ids: string[] }).ids).toHaveLength(3);
    });

    it('STUDY-03: study ids are newest first by default', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        ids.push((await t.createCard(`Card ${i}`)).id);
        await tick();
      }
      const res = await t.http().get('/cards/study-ids').expect(200);
      expect((res.body as { ids: string[] }).ids).toEqual([...ids].reverse());
    });

    it('STUDY-06: study ids have no limit (not paged at 20)', async () => {
      for (let i = 0; i < 25; i++) await t.createCard(`Card ${i}`);
      const res = await t.http().get('/cards/study-ids').expect(200);
      expect((res.body as { ids: string[] }).ids).toHaveLength(25);
    });

    it('STUDY-02: content by ids comes in the asked order; a card trashed meanwhile is skipped', async () => {
      const a = await t.createCard('A');
      const b = await t.createCard('B');
      const c = await t.createCard('C');
      await t.trash(b.id);
      const res = await t
        .http()
        .get(`/cards/by-ids?id=${c.id}&id=${b.id}&id=${a.id}`)
        .expect(200);
      expect((res.body as CardBody[]).map((x) => x.front)).toEqual(['C', 'A']);
    });

    it('STUDY-02: more than 20 ids in one batch → 400', async () => {
      const query = Array.from(
        { length: 21 },
        () => 'id=00000000-0000-4000-8000-000000000abc',
      ).join('&');
      await t.http().get(`/cards/by-ids?${query}`).expect(400);
    });
  });

  describe('UI-13 / UI-14', () => {
    it("UI-14: a card's tags with Active counts in READ-06 order; a tag's cards via GET /cards?tag=", async () => {
      const nihao = await t.createCard('你好', ['HSK1', 'greeting']);
      await t.createCard('Hello', ['greeting']);
      const old = await t.createCard('Old', ['greeting']);
      await t.trash(old.id);

      const res = await t.http().get(`/cards/${nihao.id}/tags`).expect(200);
      const tags = res.body as TagWithCount[];
      expect(tags.map((x) => [x.name, x.cardCount])).toEqual([
        ['greeting', 2],
        ['HSK1', 1],
      ]);
      const page = await t.http().get(`/cards?tag=${tags[0].id}`).expect(200);
      expect((page.body as Page<CardBody>).items.map((c) => c.front)).toEqual([
        'Hello',
        '你好',
      ]);
    });

    it('UI-14: tags of a trashed or unknown card → 404', async () => {
      const dog = await t.createCard('Dog', ['Animals']);
      await t.trash(dog.id);
      await t.http().get(`/cards/${dog.id}/tags`).expect(404);
    });

    it('UI-13: Undo after "Moved to Trash" restores with the version the trash returned', async () => {
      const dog = await t.createCard('Dog');
      const moved = await t.trash(dog.id);
      await t
        .http()
        .post(`/trash/${dog.id}/restore`)
        .set('If-Match', ifMatch(moved.version))
        .expect(200);
      expect(await t.listFronts()).toEqual(['Dog']);
    });
  });
});
