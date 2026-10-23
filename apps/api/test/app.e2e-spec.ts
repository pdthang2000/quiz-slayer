import { createTestApp } from './e2e/test-app';

describe('App (e2e)', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => (t = await createTestApp()));
  afterAll(() => t.close());

  it('GET /health', () => {
    return t.http().get('/health').expect(200).expect({ status: 'ok' });
  });
});
