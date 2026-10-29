import { Alert, type AlertButton } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { TrashedCard, TrashPage } from '../../api/types';
import { fakeApi, Providers } from '../../test/harness';
import { TrashList } from './TrashList';

const NEWEST = '2026-10-29T09:34:55.197Z';

const card = (id: string, version = 2): TrashedCard => ({
  id,
  front: `front ${id}`,
  back: `back ${id}`,
  tags: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  version,
  trashedAt: NEWEST,
});

const page = (items: TrashedCard[], total: number, nextCursor: string | null = null): TrashPage => ({
  items,
  total,
  newestTrashedAt: items.length ? NEWEST : null,
  nextCursor,
});

/** Presses the dialog button with this text, as the user would. */
async function answerAlert(alert: jest.SpyInstance, text: string, call = -1) {
  const buttons = alert.mock.calls.at(call)![2] as AlertButton[];
  await act(async () => buttons.find((b) => b.text === text)!.onPress!());
}

async function openMenu(id: string, action: 'trash-restore' | 'trash-delete') {
  await fireEvent.press(await screen.findByTestId(`card-menu-${id}`));
  await fireEvent.press(screen.getByTestId(action));
}

const showTrash = () =>
  render(
    <Providers>
      <TrashList />
    </Providers>,
  );

afterEach(() => jest.restoreAllMocks());

describe('Trash tab', () => {
  it('TRASH-12: shows trashed cards in the order the server sent, with the total, and loads more', async () => {
    const { calls } = fakeApi([
      { method: 'GET', path: /^\/trash\?cursor=c2$/, reply: { body: page([card('c')], 3) } },
      { method: 'GET', path: /^\/trash$/, reply: { body: page([card('a'), card('b')], 3, 'c2') } },
    ]);
    await showTrash();
    expect(await screen.findByText('3 cards')).toBeTruthy();
    expect(screen.getAllByText(/^front /).map((n) => n.props.children)).toEqual([
      'front a',
      'front b',
    ]);

    await fireEvent(screen.getByTestId('trash-list'), 'endReached');
    expect(await screen.findByText('front c')).toBeTruthy();
    expect(calls.map((c) => c.path)).toEqual(['/trash', '/trash?cursor=c2']);
  });

  it('TRASH-12: an empty Trash says so and offers no Empty trash', async () => {
    fakeApi([{ method: 'GET', path: /^\/trash$/, reply: { body: page([], 0) } }]);
    await showTrash();
    expect(await screen.findByText('Trash is empty.')).toBeTruthy();
    expect(screen.queryByTestId('empty-trash')).toBeNull();
  });

  it('TRASH-04: Restore sends the version shown and confirms with "Card restored"', async () => {
    const { calls } = fakeApi([
      { method: 'GET', path: /^\/trash$/, reply: { body: page([card('a', 4)], 1) } },
      { method: 'POST', path: /^\/trash\/a\/restore$/, reply: { body: { id: 'a', version: 5 } } },
    ]);
    await showTrash();
    await openMenu('a', 'trash-restore');
    expect(await screen.findByText('Card restored')).toBeTruthy();
    expect(calls.find((c) => c.method === 'POST')).toMatchObject({
      path: '/trash/a/restore',
      ifMatch: '"4"',
    });
  });

  it('TRASH-05: Delete permanently asks first, then deletes with the version shown', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const { calls } = fakeApi([
      { method: 'GET', path: /^\/trash$/, reply: { body: page([card('a', 4)], 1) } },
      { method: 'DELETE', path: /^\/trash\/a$/, reply: { status: 204 } },
    ]);
    await showTrash();
    await openMenu('a', 'trash-delete');
    expect(alert.mock.calls.at(-1)![0]).toBe('Delete this card forever?');

    await answerAlert(alert, 'Cancel');
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);

    await openMenu('a', 'trash-delete');
    await answerAlert(alert, 'Delete');
    expect(await screen.findByText('Card deleted permanently')).toBeTruthy();
    expect(calls.find((c) => c.method === 'DELETE')).toMatchObject({ ifMatch: '"4"' });
  });

  it('TRASH-10: restoring a card that already left the Trash shows the message and reloads', async () => {
    const { calls } = fakeApi([
      { method: 'GET', path: /^\/trash$/, reply: { body: page([card('a')], 1) } },
      {
        method: 'POST',
        path: /^\/trash\/a\/restore$/,
        reply: { status: 409, body: { error: 'CardIsNotTrashed' } },
      },
    ]);
    await showTrash();
    await openMenu('a', 'trash-restore');
    expect(await screen.findByText('This card is no longer in the Trash.')).toBeTruthy();
    await waitFor(() => expect(calls.filter((c) => c.path === '/trash')).toHaveLength(2));
  });

  it('TRASH-07: Empty trash asks with the total count, not only the loaded cards', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    fakeApi([
      { method: 'GET', path: /^\/trash$/, reply: { body: page([card('a'), card('b')], 47, 'c2') } },
    ]);
    await showTrash();
    await fireEvent.press(await screen.findByTestId('empty-trash'));
    expect(alert.mock.calls.at(-1)![0]).toBe('Delete 47 cards forever?');
    await answerAlert(alert, 'Cancel');
  });

  it('TRASH-11: Empty trash sends the count and newest "trashed at" the screen showed', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const { calls } = fakeApi([
      { method: 'GET', path: /^\/trash$/, reply: { body: page([card('a'), card('b')], 2) } },
      { method: 'POST', path: /^\/trash\/empty$/, reply: { status: 204 } },
    ]);
    await showTrash();
    await fireEvent.press(await screen.findByTestId('empty-trash'));
    await answerAlert(alert, 'Delete');
    expect(await screen.findByText('Trash emptied')).toBeTruthy();
    expect(calls.find((c) => c.path === '/trash/empty')?.body).toEqual({
      expectedCount: 2,
      newestTrashedAt: NEWEST,
    });
  });

  it('TRASH-11: if the Trash changed, nothing is deleted; it says so and reloads', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    let lists = 0;
    const { calls } = fakeApi([
      {
        method: 'GET',
        path: /^\/trash$/,
        // Another device trashed one more card after the screen loaded.
        reply: () => (++lists === 1
          ? { body: page([card('a'), card('b')], 2) }
          : { body: page([card('c'), card('a'), card('b')], 3) }),
      },
      {
        method: 'POST',
        path: /^\/trash\/empty$/,
        reply: {
          status: 409,
          body: { error: 'TrashChanged', expectedCount: 2, actualCount: 3 },
        },
      },
    ]);
    await showTrash();
    await fireEvent.press(await screen.findByTestId('empty-trash'));
    await answerAlert(alert, 'Delete');
    expect(await screen.findByText('Trash changed, check again.')).toBeTruthy();
    expect(await screen.findByText('3 cards')).toBeTruthy();
    expect(calls.filter((c) => c.path === '/trash')).toHaveLength(2);
  });
});
