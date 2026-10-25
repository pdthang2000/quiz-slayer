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
    const animals = (await t.tagNamed('Animals'))!;
    const preview = await t.renameTag('pitbull', 'Animals');
    expect(preview.status).toBe(409);
    expect(preview.body).toMatchObject({
      error: 'TagMergeNeedsConfirmation',
      into: 'Animals',
      intoCount: 1,
      fromCount: 1,
      resultCount: 1,
    });
    const merged0 = await t.renameTag('pitbull', 'Animals', true);
    expect(merged0.status).toBe(200);
    expect(merged0.body.id).toBe(animals.id);
    const merged = await t.http().get(`/cards/${dog.id}`).expect(200);
    expect(tagNames(merged.body as CardBody)).toEqual(['Animals']);

    // 3. move Dog to trash → hidden from list and tag count
    await t.trash(dog.id);
    expect(await t.listFronts()).toEqual([]);
    expect((await t.tagNamed('Animals'))?.cardCount).toBe(0);

    // 4. restore → Dog back with #Animals
    await t.restore(dog.id);
    const restored = await t.http().get(`/cards/${dog.id}`).expect(200);
    expect(tagNames(restored.body as CardBody)).toEqual(['Animals']);
    expect((await t.tagNamed('Animals'))?.cardCount).toBe(1);
  });
});
