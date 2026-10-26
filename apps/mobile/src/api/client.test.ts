import { ApiError, request, toQueryString } from './client';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function respond(status: number, body?: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  });
}

beforeEach(() => fetchMock.mockReset());

describe('API client', () => {
  it('CONFLICT-01: sends the version the screen showed in If-Match', async () => {
    respond(200, { id: 'c1', version: 4 });
    await request('POST', '/cards/c1/trash', { version: 3 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['If-Match']).toBe('"3"');
    expect(init.body).toBeUndefined();
  });

  it('sends no If-Match on reads', async () => {
    respond(200, { items: [], nextCursor: null });
    await request('GET', '/cards');
    expect(fetchMock.mock.calls[0][1].headers['If-Match']).toBeUndefined();
  });

  it('READ-05: repeats tag ids in the query string and leaves out empty values', () => {
    expect(toQueryString({ q: '', tag: ['a', 'b'], cursor: undefined })).toBe(
      '?tag=a&tag=b',
    );
    expect(toQueryString({ q: 'xin chào' })).toBe('?q=xin%20ch%C3%A0o');
  });

  it('CARD-08: a 409 CardChanged becomes an ApiError with that code', async () => {
    respond(409, { error: 'CardChanged', message: 'Card c1 was changed meanwhile' });
    const error = await request('PUT', '/cards/c1', { version: 1 }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'CardChanged' });
  });

  it("a non-domain error (Nest's 400 \"Bad Request\") gets a technical code", async () => {
    respond(400, { statusCode: 400, error: 'Bad Request', message: ['x'] });
    await expect(request('POST', '/cards', { body: {} })).rejects.toMatchObject({
      code: 'Http400',
    });
  });

  it('no answer from the server → code Network', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(request('GET', '/cards')).rejects.toMatchObject({
      status: 0,
      code: 'Network',
    });
  });
});
