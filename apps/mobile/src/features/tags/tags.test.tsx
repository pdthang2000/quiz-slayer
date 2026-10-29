import { Alert, type AlertButton, Pressable, Text } from 'react-native';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type { Card, TagPickerCard, TagWithCount } from '../../api/types';
import { fakeApi, Providers } from '../../test/harness';
import { CardTagsView } from './CardTagsView';
import { TagButtons } from './TagButtons';
import { TagCardRow } from './TagCardRow';
import { TagCards } from './TagCards';
import { useSelection } from './useSelection';
import { useTagActions } from './useTagActions';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const tag = (name: string, cardCount: number, version = 3): TagWithCount => ({
  id: `t-${name}`,
  name,
  color: 'blue',
  version,
  cardCount,
});

const card = (id: string, version = 1): Card => ({
  id,
  front: `front ${id}`,
  back: `back ${id}`,
  tags: [],
  createdAt: '2026-10-29T00:00:00.000Z',
  version,
});

/** Presses the dialog button with this text, as the user would. */
async function answerAlert(alert: jest.SpyInstance, text: string, call = -1) {
  const buttons = alert.mock.calls.at(call)![2] as AlertButton[];
  await act(async () => buttons.find((b) => b.text === text)!.onPress!());
}

afterEach(() => jest.restoreAllMocks());

describe('Tag list', () => {
  const tags = [tag('Animals', 312), tag('động vật', 2), tag('HSK1', 50)];

  it('UI-06: shows tags as colored buttons in the order the server sent (READ-04 A–Z)', async () => {
    await render(
      <Providers>
        <TagButtons tags={tags} onShowCards={jest.fn()} onRename={jest.fn()} onDelete={jest.fn()} />
      </Providers>,
    );
    const names = screen.getAllByText(/^#/).map((n) => n.props.children[0] + n.props.children[1]);
    expect(names).toEqual(['#Animals', '#động vật', '#HSK1']);
  });

  it('UI-06: long-press opens a sheet with Show cards · Rename · Delete', async () => {
    const onShowCards = jest.fn();
    const onRename = jest.fn();
    const onDelete = jest.fn();
    await render(
      <Providers>
        <TagButtons tags={tags} onShowCards={onShowCards} onRename={onRename} onDelete={onDelete} />
      </Providers>,
    );
    await fireEvent(screen.getByTestId('tag-Animals'), 'longPress');
    expect(screen.getByText('Show cards')).toBeTruthy();
    expect(screen.getByText('Rename')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
    await fireEvent.press(screen.getByText('Rename'));
    expect(onRename).toHaveBeenCalledWith(tags[0]);
  });

  it('UI-05: a tap on a tag shows its cards', async () => {
    const onShowCards = jest.fn();
    await render(
      <Providers>
        <TagButtons tags={tags} onShowCards={onShowCards} onRename={jest.fn()} onDelete={jest.fn()} />
      </Providers>,
    );
    await fireEvent.press(screen.getByTestId('tag-HSK1'));
    expect(onShowCards).toHaveBeenCalledWith(tags[2]);
  });
});

/** Renders buttons that call the tag actions, so a test can drive them. */
function ActionsHarness({ run }: { run: (a: ReturnType<typeof useTagActions>) => void }) {
  const actions = useTagActions();
  return (
    <Pressable onPress={() => run(actions)} testID="go">
      <Text>go</Text>
    </Pressable>
  );
}

describe('Delete a tag', () => {
  it('UI-03: asks "Animals is on 312 cards. Delete?" and sends the tag version (TAG-16)', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const api = fakeApi([{ method: 'DELETE', path: /^\/tags\/t-Animals$/, reply: { status: 204 } }]);
    await render(
      <Providers>
        <ActionsHarness run={(a) => void a.askDelete(tag('Animals', 312, 7))} />
      </Providers>,
    );
    await fireEvent.press(screen.getByTestId('go'));
    expect(alert.mock.calls[0][0]).toBe('Animals is on 312 cards. Delete?');
    await answerAlert(alert, 'Delete');
    await waitFor(() => expect(api.calls).toHaveLength(1));
    expect(api.calls[0]).toMatchObject({ method: 'DELETE', ifMatch: '"7"' });
  });

  it('UI-03: Cancel deletes nothing', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const api = fakeApi([]);
    await render(
      <Providers>
        <ActionsHarness run={(a) => void a.askDelete(tag('Animals', 1))} />
      </Providers>,
    );
    await fireEvent.press(screen.getByTestId('go'));
    expect(alert.mock.calls[0][0]).toBe('Animals is on 1 card. Delete?');
    await answerAlert(alert, 'Cancel');
    expect(api.calls).toHaveLength(0);
  });

  it('TAG-16: the tag changed meanwhile → reload and ask again with the new count', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const api = fakeApi([
      { method: 'DELETE', path: /^\/tags\/t-Dog$/, reply: { status: 409, body: { error: 'TagChanged' } } },
      { method: 'GET', path: /^\/tags$/, reply: { body: [tag('Dog', 13, 4)] } },
    ]);
    await render(
      <Providers>
        <ActionsHarness run={(a) => void a.askDelete(tag('Dog', 3, 3))} />
      </Providers>,
    );
    await fireEvent.press(screen.getByTestId('go'));
    expect(alert.mock.calls[0][0]).toBe('Dog is on 3 cards. Delete?');
    await answerAlert(alert, 'Delete');
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(2));
    expect(alert.mock.calls[1][0]).toBe('Dog is on 13 cards. Delete?');
    expect(api.calls[0].ifMatch).toBe('"3"');
  });
});

describe('Rename a tag', () => {
  it('TAG-15: onto an existing name shows the merge preview, then resends with confirmMerge', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const api = fakeApi([
      {
        method: 'PATCH',
        path: /^\/tags\/t-pitbull$/,
        reply: (call) =>
          call.body?.confirmMerge
            ? { body: { id: 't-Dogs', version: 9 } }
            : {
                status: 409,
                body: {
                  error: 'TagMergeNeedsConfirmation',
                  into: 'Dogs',
                  intoId: 't-Dogs',
                  intoCount: 2,
                  fromCount: 3,
                  resultCount: 4,
                },
              },
      },
      { method: 'GET', path: /^\/tags$/, reply: { body: [] } },
    ]);

    let result: boolean | undefined;
    await render(
      <Providers>
        <ActionsHarness
          run={(a) => void a.rename(tag('pitbull', 3, 5), 'Dogs').then((r) => (result = r))}
        />
      </Providers>,
    );
    await fireEvent.press(screen.getByTestId('go'));
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    expect(alert.mock.calls[0][0]).toBe(
      'Dogs already exists (2 cards). Merge pitbull (3 cards) into Dogs? Result: 4 cards.',
    );
    await answerAlert(alert, 'Merge');
    await waitFor(() => expect(result).toBe(true));
    const patches = api.calls.filter((c) => c.method === 'PATCH');
    expect(patches.map((c) => c.body)).toEqual([
      { name: 'Dogs' },
      { name: 'Dogs', confirmMerge: true },
    ]);
    expect(patches.every((c) => c.ifMatch === '"5"')).toBe(true);
  });

  it('TAG-15: if nobody holds the name any more (C-38), asks for a plain rename', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const api = fakeApi([
      {
        method: 'PATCH',
        path: /^\/tags\/t-pitbull$/,
        reply: (call) =>
          call.body?.confirmMerge
            ? {
                status: 409,
                body: {
                  error: 'TagMergeNeedsConfirmation',
                  into: null,
                  intoId: null,
                  intoCount: 0,
                  fromCount: 3,
                  resultCount: 3,
                },
              }
            : api.calls.filter((c) => c.method === 'PATCH').length === 1
              ? {
                  status: 409,
                  body: {
                    error: 'TagMergeNeedsConfirmation',
                    into: 'Dogs',
                    intoId: 't-Dogs',
                    intoCount: 2,
                    fromCount: 3,
                    resultCount: 4,
                  },
                }
              : { body: { id: 't-pitbull', version: 6 } },
      },
      { method: 'GET', path: /^\/tags$/, reply: { body: [] } },
    ]);
    let result: boolean | undefined;
    await render(
      <Providers>
        <ActionsHarness
          run={(a) => void a.rename(tag('pitbull', 3, 5), 'Dogs').then((r) => (result = r))}
        />
      </Providers>,
    );
    await fireEvent.press(screen.getByTestId('go'));
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    await answerAlert(alert, 'Merge');
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(2));
    expect(alert.mock.calls[1][0]).toBe('Rename pitbull to Dogs?');
    await answerAlert(alert, 'Rename');
    await waitFor(() => expect(result).toBe(true));
    expect(api.calls.filter((c) => c.method === 'PATCH').map((c) => c.body)).toEqual([
      { name: 'Dogs' },
      { name: 'Dogs', confirmMerge: true },
      { name: 'Dogs' },
    ]);
  });

  it('TAG-08: saying no to the merge changes nothing', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const api = fakeApi([
      {
        method: 'PATCH',
        path: /^\/tags\/t-pitbull$/,
        reply: {
          status: 409,
          body: {
            error: 'TagMergeNeedsConfirmation',
            into: 'Dogs',
            intoId: 't-Dogs',
            intoCount: 2,
            fromCount: 3,
            resultCount: 4,
          },
        },
      },
    ]);
    let result: boolean | undefined;
    await render(
      <Providers>
        <ActionsHarness
          run={(a) => void a.rename(tag('pitbull', 3), 'Dogs').then((r) => (result = r))}
        />
      </Providers>,
    );
    await fireEvent.press(screen.getByTestId('go'));
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    await answerAlert(alert, 'Cancel');
    await waitFor(() => expect(result).toBe(false));
    expect(api.calls).toHaveLength(1);
  });
});

describe("A tag's card list", () => {
  const dog = tag('Dog', 3, 4);
  const list = { items: [card('c1', 1), card('c2', 2), card('c3', 3)], nextCursor: null };

  it("CARDTAG-07: ✕ removes that card, sending the tag's and the card's versions", async () => {
    const api = fakeApi([
      { method: 'GET', path: /^\/cards\?tag=t-Dog/, reply: { body: list } },
      {
        method: 'POST',
        path: /^\/tags\/t-Dog\/cards\/remove$/,
        reply: { body: { tag: { id: 't-Dog', version: 5 }, cards: [{ id: 'c2', version: 3 }] } },
      },
      { method: 'GET', path: /^\/tags$/, reply: { body: [] } },
    ]);
    await render(
      <Providers>
        <TagCards tag={dog} />
      </Providers>,
    );
    await screen.findByText('front c2');
    await fireEvent.press(screen.getByTestId('remove-c2'));
    await waitFor(() =>
      expect(api.calls.find((c) => c.path.endsWith('/cards/remove'))).toMatchObject({
        ifMatch: '"4"',
        body: { cards: [{ cardId: 'c2', version: 2 }] },
      }),
    );
  });

  it('CARDTAG-07: checkboxes + "Remove (n)", then Undo puts them back with the new versions', async () => {
    const api = fakeApi([
      { method: 'GET', path: /^\/cards\?tag=t-Dog/, reply: { body: list } },
      {
        method: 'POST',
        path: /^\/tags\/t-Dog\/cards\/remove$/,
        reply: {
          body: {
            tag: { id: 't-Dog', version: 5 },
            cards: [
              { id: 'c1', version: 2 },
              { id: 'c3', version: 4 },
            ],
          },
        },
      },
      {
        method: 'POST',
        path: /^\/tags\/t-Dog\/cards$/,
        reply: { body: { tag: { id: 't-Dog', version: 6 }, cards: [] } },
      },
      { method: 'GET', path: /^\/tags$/, reply: { body: [] } },
    ]);
    await render(
      <Providers>
        <TagCards tag={dog} />
      </Providers>,
    );
    await screen.findByText('front c1');
    await fireEvent.press(screen.getByTestId('check-c1'));
    await fireEvent.press(screen.getByTestId('check-c3'));
    await fireEvent.press(screen.getByText('Remove (2)'));
    await screen.findByText('Removed from #Dog');
    expect(api.calls.find((c) => c.path.endsWith('/cards/remove'))!.body).toEqual({
      cards: [
        { cardId: 'c1', version: 1 },
        { cardId: 'c3', version: 3 },
      ],
    });
    await fireEvent.press(screen.getByText('Undo'));
    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'POST' && c.path === '/tags/t-Dog/cards')).toMatchObject({
        ifMatch: '"5"',
        body: {
          cards: [
            { cardId: 'c1', version: 2 },
            { cardId: 'c3', version: 4 },
          ],
        },
      }),
    );
  });

  it('CARDTAG-07: a stale tag (TagChanged) shows the message and reloads', async () => {
    const api = fakeApi([
      { method: 'GET', path: /^\/cards\?tag=t-Dog/, reply: { body: list } },
      {
        method: 'POST',
        path: /^\/tags\/t-Dog\/cards\/remove$/,
        reply: { status: 409, body: { error: 'TagChanged' } },
      },
      { method: 'GET', path: /^\/tags$/, reply: { body: [] } },
    ]);
    await render(
      <Providers>
        <TagCards tag={dog} />
      </Providers>,
    );
    await screen.findByText('front c1');
    await fireEvent.press(screen.getByTestId('remove-c1'));
    await screen.findByText('This tag was changed on another device. Refresh.');
    await waitFor(() =>
      expect(api.calls.filter((c) => c.path.startsWith('/cards?tag=t-Dog')).length).toBeGreaterThanOrEqual(2),
    );
  });
});

describe('Selecting cards', () => {
  it('CARDTAG-07: at most 100 cards per action; the 101st is refused', async () => {
    const { result } = await renderHook(() => useSelection());
    for (let i = 0; i < 100; i++) {
      await act(async () => void result.current.toggle({ id: `c${i}`, version: 0 }));
    }
    expect(result.current.count).toBe(100);
    let accepted = true;
    await act(async () => void (accepted = result.current.toggle({ id: 'c100', version: 0 })));
    expect(accepted).toBe(false);
    expect(result.current.count).toBe(100);
  });

  it('CARDTAG-08: a card that already has 20 tags is greyed out and cannot be ticked', async () => {
    const full: TagPickerCard = { ...card('c9'), atTagLimit: true };
    const onToggle = jest.fn();
    await render(
      <Providers>
        <TagCardRow card={full} tagName="Dog" checked={false} onToggle={onToggle} disabled note="Has 20 tags" />
      </Providers>,
    );
    await fireEvent.press(screen.getByTestId('check-c9'));
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByText('Has 20 tags')).toBeTruthy();
  });
});

describe('⋯ → Tags', () => {
  it("UI-14: loads only the card's tags and counts; a tag's cards load when expanded", async () => {
    const api = fakeApi([
      {
        method: 'GET',
        path: /^\/cards\/c1\/tags$/,
        reply: { body: [tag('greeting', 12), tag('HSK1', 50)] },
      },
      {
        method: 'GET',
        path: /^\/cards\?tag=t-greeting/,
        reply: { body: { items: [card('c1')], nextCursor: 'next' } },
      },
    ]);
    await render(
      <Providers>
        <CardTagsView cardId="c1" />
      </Providers>,
    );
    await screen.findByText('(12)');
    expect(screen.getByText('(50)')).toBeTruthy();
    expect(api.calls.map((c) => c.path)).toEqual(['/cards/c1/tags']);

    await fireEvent.press(screen.getByTestId('expand-greeting'));
    await screen.findByText('front c1');
    expect(screen.getByText('Load more')).toBeTruthy(); // 20 at a time
    expect(api.calls.map((c) => c.path)).toEqual(['/cards/c1/tags', '/cards?tag=t-greeting']);
  });
});
