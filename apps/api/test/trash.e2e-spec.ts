import { CardBody, createTestApp, tagNames, tick } from './e2e/test-app';

type TrashPage = {
  items: (CardBody & { trashedAt: string })[];
  total: number;
  nextCursor: string | null;
};

describe('Trash (e2e)', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;
  const trashPage = async (query = '') =>
    (await t.http().get(`/trash${query}`).expect(200)).body as TrashPage;

  beforeAll(async () => (t = await createTestApp()));
  beforeEach(() => t.reset());
  afterAll(() => t.close());

  it('TRASH-01: moving a card to the trash puts it in the Trash, not gone', async () => {
    const dog = await t.createCard('Dog');
    await t.trash(dog.id);
    const page = await trashPage();
    expect(page.items.map((c) => c.front)).toEqual(['Dog']);
    expect(page.items[0].trashedAt).toEqual(expect.any(String));
  });

  it('TRASH-12: most recently trashed first, 20 at a time, with the total (TRASH-07)', async () => {
    const cards: CardBody[] = [];
    for (let i = 1; i <= 22; i++) cards.push(await t.createCard(`Card ${i}`));
    for (const card of [...cards].reverse()) {
      await t.trash(card.id); // Card 22 first … Card 1 last
      await tick();
    }
    const first = await trashPage();
    expect(first.total).toBe(22);
    expect(first.items).toHaveLength(20);
    expect(first.items[0].front).toBe('Card 1');
    const second = await trashPage(`?cursor=${first.nextCursor}`);
    expect(second.items.map((c) => c.front)).toEqual(['Card 21', 'Card 22']);
    expect(second.nextCursor).toBeNull();
  });

  it('TRASH-07: the Trash carries the total count for the "Delete N cards forever?" dialog', async () => {
    for (const front of ['A', 'B'])
      await t.trash((await t.createCard(front)).id);
    await t.createCard('Active');
    expect((await trashPage()).total).toBe(2);
  });

  it('TRASH-04: restore brings the card back with its tags', async () => {
    const card = await t.createCard('你好', ['HSK1', 'greeting']);
    await t.trash(card.id);
    expect((await t.tagNamed('HSK1'))?.cardCount).toBe(0);
    await t.http().post(`/trash/${card.id}/restore`).expect(204);
    const back = await t.http().get(`/cards/${card.id}`).expect(200);
    expect(tagNames(back.body as CardBody)).toEqual(['HSK1', 'greeting']);
  });

  it('TRASH-06: a tag deleted while the card was trashed is gone after restore', async () => {
    const card = await t.createCard('你好', ['HSK1', 'greeting']);
    await t.trash(card.id);
    const greeting = await t.tagNamed('greeting');
    await t.http().delete(`/tags/${greeting?.id}`).expect(204);
    await t.http().post(`/trash/${card.id}/restore`).expect(204);
    const back = await t.http().get(`/cards/${card.id}`).expect(200);
    expect(tagNames(back.body as CardBody)).toEqual(['HSK1']);
  });

  it('TRASH-05: deleting permanently removes the card', async () => {
    const dog = await t.createCard('Dog', ['Animals']);
    await t.trash(dog.id);
    await t.http().delete(`/trash/${dog.id}`).expect(204);
    expect((await trashPage()).total).toBe(0);
    expect((await t.tagNamed('Animals'))?.cardCount).toBe(0);
  });

  it('TRASH-09: an active card cannot be deleted permanently → 409 CardIsNotTrashed', async () => {
    const dog = await t.createCard('Dog');
    const res = await t.http().delete(`/trash/${dog.id}`).expect(409);
    expect(res.body.error).toBe('CardIsNotTrashed');
  });

  it('TRASH-10: trashing a trashed card → 409 CardIsTrashed; restoring an active card → 409 CardIsNotTrashed', async () => {
    const dog = await t.createCard('Dog');
    const res1 = await t.http().post(`/trash/${dog.id}/restore`).expect(409);
    expect(res1.body.error).toBe('CardIsNotTrashed');
    await t.trash(dog.id);
    const res2 = await t.http().post(`/cards/${dog.id}/trash`).expect(409);
    expect(res2.body.error).toBe('CardIsTrashed');
  });

  it('TRASH-11: empty trash with a stale count → 409 TrashChanged, nothing deleted', async () => {
    for (const front of ['A', 'B', 'C']) {
      await t.trash((await t.createCard(front)).id);
    }
    const res = await t
      .http()
      .post('/trash/empty')
      .send({ expectedCount: 2 })
      .expect(409);
    expect(res.body).toMatchObject({
      error: 'TrashChanged',
      expectedCount: 2,
      actualCount: 3,
    });
    expect((await trashPage()).total).toBe(3);
  });

  it('TRASH-11: empty trash with the right count deletes every trashed card, and only those', async () => {
    for (const front of ['A', 'B', 'C']) {
      await t.trash((await t.createCard(front)).id);
    }
    await t.createCard('Active');
    await t.http().post('/trash/empty').send({ expectedCount: 3 }).expect(204);
    expect((await trashPage()).total).toBe(0);
    expect(await t.listFronts()).toEqual(['Active']);
  });
});
