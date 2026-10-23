import { CardBody, createTestApp, tagNames } from './e2e/test-app';

describe('Tags (e2e)', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => (t = await createTestApp()));
  beforeEach(() => t.reset());
  afterAll(() => t.close());

  it('READ-04: the Tag list is A–Z, ignoring case and accents', async () => {
    await t.createCard('x', [
      'HSK1',
      '动物',
      'dog',
      'Animals',
      'động vật',
      'apple',
      'animals',
    ]);
    expect((await t.tags()).map((x) => x.name)).toEqual([
      'animals',
      'Animals',
      'apple',
      'dog',
      'động vật',
      'HSK1',
      '动物',
    ]);
  });

  it('UI-03: each tag carries its Active card count; TAG-13: and its color key', async () => {
    await t.createCard('Cat', ['Animals']);
    await t.createCard('Dog', ['Animals']);
    const animals = await t.tagNamed('Animals');
    expect(animals?.cardCount).toBe(2);
    expect(animals?.color).toMatch(/^[a-z]+$/);
  });

  it('UI-08: there is no endpoint to create a tag', async () => {
    await t.http().post('/tags').send({ name: 'Animals' }).expect(404);
  });

  it('TAG-11: a rename shows on every card with the tag; TAG-12: the color stays', async () => {
    const cat = await t.createCard('Cat', ['Animals']);
    const before = await t.tagNamed('Animals');
    await t
      .http()
      .patch(`/tags/${before?.id}`)
      .send({ name: 'Mammals' })
      .expect(200, { id: before?.id });
    const card = await t.http().get(`/cards/${cat.id}`).expect(200);
    expect(tagNames(card.body as CardBody)).toEqual(['Mammals']);
    expect((await t.tagNamed('Mammals'))?.color).toBe(before?.color);
  });

  it('TAG-14: renaming to the current name is a no-op', async () => {
    await t.createCard('Cat', ['Animals']);
    const animals = await t.tagNamed('Animals');
    await t
      .http()
      .patch(`/tags/${animals?.id}`)
      .send({ name: ' Animals ' })
      .expect(200, { id: animals?.id });
  });

  it('TAG-02: renaming animals → Animals when only animals exists is a plain rename', async () => {
    await t.createCard('Cat', ['animals']);
    const animals = await t.tagNamed('animals');
    await t
      .http()
      .patch(`/tags/${animals?.id}`)
      .send({ name: 'Animals' })
      .expect(200);
    expect((await t.tags()).map((x) => x.name)).toEqual(['Animals']);
  });

  it('TAG-15: a rename onto an existing name → 409 with the preview; Active counts only', async () => {
    // pitbull [Dog, Rex, Max, trashed Old]   Dogs [Dog, Fido]
    await t.createCard('Dog', ['pitbull', 'Dogs']);
    await t.createCard('Rex', ['pitbull']);
    await t.createCard('Max', ['pitbull']);
    await t.createCard('Fido', ['Dogs']);
    const old = await t.createCard('Old', ['pitbull']);
    await t.trash(old.id);
    const pitbull = await t.tagNamed('pitbull');
    const dogs = await t.tagNamed('Dogs');

    const res = await t
      .http()
      .patch(`/tags/${pitbull?.id}`)
      .send({ name: 'Dogs' })
      .expect(409);
    expect(res.body).toMatchObject({
      error: 'TagMergeNeedsConfirmation',
      into: 'Dogs',
      intoId: dogs?.id,
      intoCount: 2,
      fromCount: 3,
      resultCount: 4,
    });
    expect(await t.tagNamed('pitbull')).toBeDefined(); // nothing merged yet
  });

  it('TAG-08: with confirmMerge the merge runs; TAG-09: the trashed card is moved too', async () => {
    await t.createCard('Dog', ['pitbull', 'Dogs']);
    await t.createCard('Rex', ['pitbull']);
    const old = await t.createCard('Old', ['pitbull']);
    await t.trash(old.id);
    const pitbull = await t.tagNamed('pitbull');
    const dogs = await t.tagNamed('Dogs');

    await t
      .http()
      .patch(`/tags/${pitbull?.id}`)
      .send({ name: 'Dogs', confirmMerge: true })
      .expect(200, { id: dogs?.id });

    expect((await t.tags()).map((x) => x.name)).toEqual(['Dogs']);
    expect((await t.tagNamed('Dogs'))?.cardCount).toBe(2);
    await t.http().post(`/trash/${old.id}/restore`).expect(204);
    const restored = await t.http().get(`/cards/${old.id}`).expect(200);
    expect(tagNames(restored.body as CardBody)).toEqual(['Dogs']);
  });

  it('TAG-06: deleting a tag removes it from every card; cards stay', async () => {
    const cat = await t.createCard('Cat', ['Animals', 'pets']);
    await t.createCard('Fish', ['Animals']);
    const animals = await t.tagNamed('Animals');
    await t.http().delete(`/tags/${animals?.id}`).expect(204);
    expect((await t.listFronts()).sort()).toEqual(['Cat', 'Fish']);
    const card = await t.http().get(`/cards/${cat.id}`).expect(200);
    expect(tagNames(card.body as CardBody)).toEqual(['pets']);
  });

  it('TAG-07: a deleted tag name can be used again right away', async () => {
    await t.createCard('Cat', ['Animals']);
    const animals = await t.tagNamed('Animals');
    await t.http().delete(`/tags/${animals?.id}`).expect(204);
    const dog = await t.createCard('Dog', ['Animals']);
    expect(tagNames(dog)).toEqual(['Animals']);
  });

  it('an unknown tag → 404 TagNotFound', async () => {
    const res = await t
      .http()
      .patch('/tags/00000000-0000-4000-8000-00000000abcd')
      .send({ name: 'x' })
      .expect(404);
    expect(res.body.error).toBe('TagNotFound');
  });
});
