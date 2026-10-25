import { CardBody, createTestApp, ifMatch } from './e2e/test-app';

// Phase 3.3: TAG-16 covers the tag's Active cards from every path (C-45),
// and the tag list's add/remove check the tag's version too (C-46).
describe('Phase 3.3 (e2e): tag versions follow the tag cards', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => (t = await createTestApp()));
  beforeEach(() => t.reset());
  afterAll(() => t.close());

  const dogVersion = async () => (await t.tagNamed('Dog'))!.version;
  const save = (card: CardBody, tags: string[]) =>
    t
      .http()
      .put(`/cards/${card.id}`)
      .set('If-Match', ifMatch(card.version))
      .send({ front: card.front, back: card.back, tags });

  describe('TAG-16: what changes a tag version', () => {
    it('TAG-16: "Delete #Dog? 3 cards" → a card gets #Dog in the editor → delete with the old version → 409 TagChanged', async () => {
      for (const f of ['Rex', 'Max', 'Fido']) await t.createCard(f, ['Dog']);
      const dialog = (await t.tagNamed('Dog'))!; // "Delete #Dog? It's on 3 cards."
      const pup = await t.createCard('Pup');
      await save(pup, ['Dog']).expect(200); // laptop, card editor

      const res = await t
        .http()
        .delete(`/tags/${dialog.id}`)
        .set('If-Match', ifMatch(dialog.version))
        .expect(409);
      expect(res.body.error).toBe('TagChanged');
      expect((await t.tagNamed('Dog'))?.cardCount).toBe(4);
    });

    it('TAG-16: createCard with #Dog changes #Dog (existing and new tags)', async () => {
      await t.createCard('Rex', ['Dog']);
      expect(await dogVersion()).toBe(1); // a new tag that got its first card
      await t.createCard('Max', ['Dog']);
      expect(await dogVersion()).toBe(2);
    });

    it('TAG-16: an editor Save that removes #Dog changes it; one that keeps the tags does not', async () => {
      const rex = await t.createCard('Rex', ['Dog', 'pet']);
      const before = await dogVersion();
      const kept = (await save(rex, ['Dog', 'pet']).expect(200))
        .body as CardBody;
      expect(await dogVersion()).toBe(before);
      await save(kept, ['pet']).expect(200);
      expect(await dogVersion()).toBe(before + 1);
    });

    it('TAG-16: trash a card with #Dog → #Dog changed; restore → changed again', async () => {
      const rex = await t.createCard('Rex', ['Dog']);
      const v0 = await dogVersion();
      await t.trash(rex.id);
      expect(await dogVersion()).toBe(v0 + 1);
      await t.restore(rex.id);
      expect(await dogVersion()).toBe(v0 + 2);
    });

    it('TAG-16: delete permanently and empty trash do not change it (trashed cards are not Active)', async () => {
      const rex = await t.createCard('Rex', ['Dog']);
      const max = await t.createCard('Max', ['Dog']);
      await t.trash(rex.id);
      await t.trash(max.id);
      const v = await dogVersion();
      await t.deletePermanently(rex.id);
      await t.emptyTrash();
      expect(await dogVersion()).toBe(v);
    });

    it('TAG-16: a Save that fails changes no tag version (same transaction)', async () => {
      const rex = await t.createCard('Rex', ['Dog']);
      await save(rex, ['Dog', 'pet']).expect(200); // laptop
      const v = await dogVersion();
      await save(rex, []).expect(409); // phone, outdated → CardChanged
      expect(await dogVersion()).toBe(v);
    });
  });

  describe('C-46: the tag list sends the tag version', () => {
    async function dogShownThenRenamed() {
      const rex = await t.createCard('Rex', ['Dog']);
      const max = await t.createCard('Max');
      const shown = (await t.tagNamed('Dog'))!; // phone opens #Dog's card list
      const renamed = await t.renameTag('Dog', 'Hound'); // laptop
      expect(renamed.status).toBe(200);
      return { rex, max, shown };
    }

    it('TAG-16: tag list Add with an old tag version (renamed on another device) → 409 TagChanged, nothing added (C-46)', async () => {
      const { max, shown } = await dogShownThenRenamed();
      const res = await t
        .http()
        .post(`/tags/${shown.id}/cards`)
        .set('If-Match', ifMatch(shown.version))
        .send({ cards: [{ cardId: max.id, version: max.version }] })
        .expect(409);
      expect(res.body.error).toBe('TagChanged');
      expect((await t.tagNamed('Hound'))?.cardCount).toBe(1);
    });

    it('TAG-16: tag list Remove with an old tag version → 409 TagChanged, nothing removed (C-46)', async () => {
      const { rex, shown } = await dogShownThenRenamed();
      const res = await t
        .http()
        .post(`/tags/${shown.id}/cards/remove`)
        .set('If-Match', ifMatch(shown.version))
        .send({ cards: [{ cardId: rex.id, version: rex.version }] })
        .expect(409);
      expect(res.body.error).toBe('TagChanged');
      expect((await t.tagNamed('Hound'))?.cardCount).toBe(1);
    });

    it('CARDTAG-08: tag list Add without If-Match → 428', async () => {
      const max = await t.createCard('Max', ['Dog']);
      const dog = (await t.tagNamed('Dog'))!;
      await t
        .http()
        .post(`/tags/${dog.id}/cards`)
        .send({ cards: [{ cardId: max.id, version: max.version }] })
        .expect(428);
    });
  });

  describe('CONFLICT-01: versions travel in If-Match', () => {
    it('CONFLICT-01: If-Match takes a quoted ETag or a bare number', async () => {
      const a = await t.createCard('A');
      const b = await t.createCard('B');
      await t
        .http()
        .post(`/cards/${a.id}/trash`)
        .set('If-Match', `"${a.version}"`)
        .expect(200);
      await t
        .http()
        .post(`/cards/${b.id}/trash`)
        .set('If-Match', String(b.version))
        .expect(200);
    });

    it('CONFLICT-01: DELETE needs no body — the version is in If-Match', async () => {
      const dog = await t.createCard('Dog', ['Animals']);
      const trashed = await t.trash(dog.id);
      await t
        .http()
        .delete(`/trash/${dog.id}`)
        .set('If-Match', ifMatch(trashed.version))
        .expect(204);
      const animals = (await t.tagNamed('Animals'))!;
      await t
        .http()
        .delete(`/tags/${animals.id}`)
        .set('If-Match', ifMatch(animals.version))
        .expect(204);
    });
  });
});
