import { CardBody, createTestApp, tagNames } from './e2e/test-app';

// plan.md → Checkpoint 3: the end-to-end scenario, over HTTP.
describe('Checkpoint 3 scenario', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    t = await createTestApp();
    await t.reset();
  });
  afterAll(() => t.close());

  it('create → merge → trash → restore', async () => {
    // 1. create [Dog | a mammal that barks] with #Animals #pitbull → both tags exist
    const dog = await t.createCard(
      'Dog',
      ['Animals', 'pitbull'],
      'a mammal that barks',
    );
    expect(tagNames(dog)).toEqual(['Animals', 'pitbull']);
    expect((await t.tags()).map((x) => x.name)).toEqual(['Animals', 'pitbull']);

    // 2. rename pitbull → Animals → merge preview, then merge → Dog has only #Animals
    const pitbull = (await t.tagNamed('pitbull'))!;
    const animals = (await t.tagNamed('Animals'))!;
    const preview = await t
      .http()
      .patch(`/tags/${pitbull.id}`)
      .send({ name: 'Animals' })
      .expect(409);
    expect(preview.body).toMatchObject({
      error: 'TagMergeNeedsConfirmation',
      into: 'Animals',
      intoCount: 1,
      fromCount: 1,
      resultCount: 1,
    });
    await t
      .http()
      .patch(`/tags/${pitbull.id}`)
      .send({ name: 'Animals', confirmMerge: true })
      .expect(200, { id: animals.id });
    const merged = await t.http().get(`/cards/${dog.id}`).expect(200);
    expect(tagNames(merged.body as CardBody)).toEqual(['Animals']);

    // 3. move Dog to trash → hidden from list and tag count
    await t.trash(dog.id);
    expect(await t.listFronts()).toEqual([]);
    expect((await t.tagNamed('Animals'))?.cardCount).toBe(0);

    // 4. restore → Dog back with #Animals
    await t.http().post(`/trash/${dog.id}/restore`).expect(204);
    const restored = await t.http().get(`/cards/${dog.id}`).expect(200);
    expect(tagNames(restored.body as CardBody)).toEqual(['Animals']);
    expect((await t.tagNamed('Animals'))?.cardCount).toBe(1);
  });
});
