import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { Card } from '../../api/types';
import { fakeApi, type FetchCall, Providers } from '../../test/harness';
import {
  idsToFetch,
  next,
  prev,
  shuffleUnseen,
  swipeMove,
  skipMissing,
  startSession,
  type StudySession,
} from './session';
import { StudyButton } from './StudyButton';
import { StudyScreen } from './StudyScreen';
import { STUDY_SIDE_KEY } from './useStudySide';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const card = (id: string): Card => ({
  id,
  front: `front ${id}`,
  back: `back ${id}`,
  tags: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  version: 1,
});

const ids = (n: number) => Array.from({ length: n }, (_, i) => `c${i + 1}`);

/** Answers GET /cards/by-ids with the asked cards, minus `gone` (trashed/deleted meanwhile). */
function studyApi(sessionIds: string[], gone: string[] = []) {
  return fakeApi([
    { method: 'GET', path: /^\/cards\/study-ids/, reply: { body: { ids: sessionIds } } },
    {
      method: 'GET',
      path: /^\/cards\/by-ids\?/,
      reply: (call: FetchCall) => ({
        body: [...call.path.matchAll(/id=([^&]+)/g)]
          .map(([, id]) => id)
          .filter((id) => !gone.includes(id))
          .map(card),
      }),
    },
  ]);
}

const onClose = jest.fn();
const showStudy = (filter = {}) =>
  render(
    <Providers>
      <StudyScreen filter={filter} onClose={onClose} />
    </Providers>,
  );

const progress = () => screen.getByTestId('study-progress').props.children;
const shownText = async () => {
  const node = await screen.findByTestId('study-card');
  return (node as unknown as { children: { props: { children: string } }[] }).children[0].props
    .children;
};
const press = (id: string) => fireEvent.press(screen.getByTestId(id));
const byIdsCalls = (calls: FetchCall[]) => calls.filter((c) => c.path.startsWith('/cards/by-ids'));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('Study session', () => {
  it('STUDY-01: loads the ids for exactly the list filter (search + tag chips)', async () => {
    const { calls } = studyApi(['c1']);
    await showStudy({ search: 'dog', tagIds: ['t1', 't2'] });
    await screen.findByText('front c1');
    expect(calls[0].path).toBe('/cards/study-ids?q=dog&tag=t1&tag=t2');
  });

  it('STUDY-02: the ids are taken once, when Study opens; moving never reloads them', async () => {
    const { calls } = studyApi(ids(3));
    await showStudy();
    await screen.findByText('front c1');
    await press('study-next');
    await press('study-next');
    expect(calls.filter((c) => c.path.startsWith('/cards/study-ids'))).toHaveLength(1);
  });

  it('STUDY-03: newest first by default, in the order the server sent', async () => {
    studyApi(['c3', 'c2', 'c1']);
    await showStudy();
    expect(await screen.findByText('front c3')).toBeTruthy();
    await press('study-next');
    expect(screen.getByText('front c2')).toBeTruthy();
  });

  it('STUDY-04: the front is shown first by default; a tap flips to the back', async () => {
    studyApi(['c1']);
    await showStudy();
    expect(await screen.findByText('front c1')).toBeTruthy();
    await press('study-card');
    expect(screen.getByText('back c1')).toBeTruthy();
    expect(screen.getByTestId('study-side')).toBeTruthy();
  });

  it('STUDY-05: only reads; nothing is sent back to the server', async () => {
    const { calls } = studyApi(ids(3));
    await showStudy();
    await screen.findByText('front c1');
    await press('study-card');
    await press('study-next');
    await press('study-next');
    await press('study-next');
    await screen.findByTestId('study-done');
    expect(calls.every((c) => c.method === 'GET')).toBe(true);
  });

  it('STUDY-06: no limit on cards; content comes 20 at a time, the next batch ahead of need', async () => {
    const { calls } = studyApi(ids(45));
    await showStudy();
    await screen.findByText('front c1');
    expect(byIdsCalls(calls)).toHaveLength(1);
    expect(progress()).toBe('1 / 45');
    for (let i = 0; i < 16; i++) await press('study-next'); // at 17: 3 fetched cards ahead
    await waitFor(() => expect(byIdsCalls(calls)).toHaveLength(2));
    expect(byIdsCalls(calls)[1].path).toContain('id=c21');
    expect(byIdsCalls(calls)[1].path).not.toContain('id=c20&');
  });

  it('STUDY-07: the Study button is disabled with 0 cards', async () => {
    await render(<StudyButton filter={{}} disabled />);
    await press('study-button');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('STUDY-07: on a tag\'s list it reads "Study #HSK1" and opens Study with that list\'s filter', async () => {
    await render(<StudyButton filter={{ tagIds: ['t1'] }} tagName="HSK1" disabled={false} />);
    expect(screen.getByText('Study #HSK1')).toBeTruthy();
    await press('study-button');
    expect(router.push).toHaveBeenCalledWith({ pathname: '/study', params: { tag: 't1' } });
  });

  it('STUDY-08: progress "n / total", Prev and Next', async () => {
    studyApi(ids(3));
    await showStudy();
    await screen.findByText('front c1');
    expect(progress()).toBe('1 / 3');
    await press('study-next');
    expect(progress()).toBe('2 / 3');
    expect(screen.getByText('front c2')).toBeTruthy();
    await press('study-prev');
    expect(progress()).toBe('1 / 3');
    await press('study-prev'); // stays on the first card
    expect(progress()).toBe('1 / 3');
  });

  it('STUDY-08: swipe left = next, swipe right = previous; a short move does nothing', () => {
    expect(swipeMove(-80)).toBe(next);
    expect(swipeMove(80)).toBe(prev);
    expect(swipeMove(20)).toBeNull();
  });

  it('STUDY-09: shuffle in the middle reshuffles only cards not seen yet; the position stays', () => {
    const at12: StudySession = { order: ids(50), position: 11 };
    const reversed = () => 0; // Fisher–Yates with random 0 rotates the tail
    const after = shuffleUnseen(at12, reversed);
    expect(after.position).toBe(11);
    expect(after.order.slice(0, 12)).toEqual(ids(12));
    expect(after.order.slice(12)).not.toEqual(ids(50).slice(12));
    expect([...after.order.slice(12)].sort()).toEqual([...ids(50).slice(12)].sort());
  });

  it('STUDY-09: the Shuffle button keeps the cards already seen and the position', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    studyApi(ids(4));
    await showStudy();
    await screen.findByText('front c1');
    await press('study-next');
    await press('study-shuffle');
    expect(progress()).toBe('2 / 4');
    expect(await shownText()).toBe('front c2');
    await press('study-prev');
    expect(await shownText()).toBe('front c1');
    jest.restoreAllMocks();
  });

  it('STUDY-10: the front/back switch applies at once and is remembered on this phone', async () => {
    studyApi(['c1']);
    await showStudy();
    await screen.findByText('front c1');
    await press('study-side');
    expect(screen.getByText('back c1')).toBeTruthy();
    expect(screen.getByText('Back first')).toBeTruthy();
    await waitFor(async () => expect(await AsyncStorage.getItem(STUDY_SIDE_KEY)).toBe('back'));
  });

  it('STUDY-10: the next session starts with the side remembered on this phone', async () => {
    await AsyncStorage.setItem(STUDY_SIDE_KEY, 'back');
    studyApi(['c1']);
    await showStudy();
    expect(await screen.findByText('back c1')).toBeTruthy();
  });

  it('STUDY-11: after the last card "Done! n cards" with Study again · Shuffle & again · Close', async () => {
    studyApi(ids(2));
    await showStudy();
    await screen.findByText('front c1');
    await press('study-next');
    await press('study-next');
    expect(await screen.findByText('Done! 2 cards')).toBeTruthy();
    await press('study-again');
    expect(progress()).toBe('1 / 2');
    expect(screen.getByText('front c1')).toBeTruthy();

    await press('study-next');
    await press('study-next');
    await press('study-shuffle-again');
    expect(progress()).toBe('1 / 2');

    await press('study-next');
    await press('study-next');
    await press('study-done-close');
    expect(onClose).toHaveBeenCalled();
  });

  it('STUDY-11: ✕ leaves at once, in the middle', async () => {
    studyApi(ids(3));
    await showStudy();
    await screen.findByText('front c1');
    await press('study-close');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('STUDY-12: a card trashed or deleted meanwhile is skipped; the total shrinks', async () => {
    studyApi(ids(3), ['c2']);
    await showStudy();
    await screen.findByText('front c1');
    await waitFor(() => expect(progress()).toBe('1 / 2'));
    await press('study-next');
    expect(screen.getByText('front c3')).toBeTruthy();
  });

  it('STUDY-12: skipping keeps the card on screen in its place', () => {
    const s = skipMissing({ order: ['a', 'b', 'c', 'd'], position: 1 }, new Set(['c']));
    expect(s).toEqual({ order: ['a', 'b', 'd'], position: 1 });
    expect(next(startSession(['a']))).toEqual({ order: ['a'], position: 1 });
    expect(idsToFetch({ order: ids(30), position: 0 }, new Set(ids(20)))).toEqual([]);
  });
});
