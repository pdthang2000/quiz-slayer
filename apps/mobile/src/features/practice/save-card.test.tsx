import { Text } from 'react-native';
import { router, Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../../i18n';
import type { CardDraft, DailySession } from '../../api/types';
import { ToastProvider } from '../../components/Toast';
import SaveCardScreen from '../../app/practice/save-card';
import { fakeApi } from '../../test/harness';

jest.mock('expo-localization', () => ({
  ...jest.requireActual('expo-localization'),
  getCalendars: () => [{ timeZone: 'Asia/Ho_Chi_Minh' }],
}));

function Layout() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } });
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <Stack />
      </ToastProvider>
    </QueryClientProvider>
  );
}

const session = (cardDraft: CardDraft | undefined): DailySession => ({
  id: 's1',
  trackId: 't1',
  tagName: 'HSK4',
  day: '2026-11-07',
  dailySize: 1,
  short: false,
  finished: true,
  closed: false,
  progress: { answered: 1, total: 1 },
  result: { correct: 0, total: 1 },
  quizzes: [
    {
      id: 'a',
      kind: 'single',
      questions: [{ id: 'a-q', text: 'q', choices: ['x', 'y'] }],
      answer: {
        questions: [
          {
            questionId: 'a-q',
            chosen: 1,
            correctChoice: 0,
            correct: false,
            canSaveAsCard: true,
            savedAsCard: false,
            note: null,
            noteVersion: 0,
            cardDraft,
          },
        ],
      },
    },
  ],
});

const tooLong = { front: 'the front', back: 'b'.repeat(3400), tagName: 'HSK4' };

async function open(...args: [CardDraft?] | [undefined]) {
  const draft = args.length === 0 ? tooLong : args[0];
  const api = fakeApi([
    { method: 'GET', path: /^\/practice\/sessions\/s1$/, reply: { body: session(draft) } },
    { method: 'GET', path: /^\/tags/, reply: { body: [] } },
    { method: 'POST', path: /save-as-card$/, reply: { status: 201, body: { cardId: 'c1' } } },
  ]);
  await renderRouter(
    { _layout: Layout, index: () => <Text>quiz</Text>, 'practice/save-card': SaveCardScreen },
    { initialUrl: '/' },
  );
  await act(() =>
    router.push({ pathname: '/practice/save-card', params: { sessionId: 's1', questionId: 'a-q' } }),
  );
  return api;
}

describe('DP-64: the Save as card editor', () => {
  it('DP-64: opens titled "Save as card", filled in with front, back and the tag', async () => {
    await open();
    expect(await screen.findByTestId('back')).toBeTruthy();
    expect(screen.getByTestId('front').props.value).toBe('the front');
    expect(screen.getByTestId('back').props.value).toBe(tooLong.back);
    expect(screen.getByText('#HSK4')).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).toContain('"title":"Save as card"');
  });

  it('DP-64: a counter shows the length; Save is off until the card fits', async () => {
    await open();
    await screen.findByTestId('back');
    expect(screen.getByTestId('counter-back').props.children).toBe('3,400 / 3,000');
    expect(screen.getByTestId('save-card-save').props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByTestId('back'), 'short');
    expect(screen.getByTestId('counter-back').props.children).toBe('5 / 3,000');
    expect(screen.getByTestId('save-card-save').props.accessibilityState.disabled).toBe(false);
  });

  it('DP-64: a front over 500 keeps Save off too', async () => {
    await open({ front: 'f'.repeat(501), back: 'b', tagName: 'HSK4' });
    await screen.findByTestId('front');
    expect(screen.getByTestId('counter-front').props.children).toBe('501 / 500');
    expect(screen.getByTestId('save-card-save').props.accessibilityState.disabled).toBe(true);
  });

  it('DP-64: Save sends the edited card to save-as-card, then goes back with no pop-up', async () => {
    const { calls } = await open();
    await screen.findByTestId('back');
    await fireEvent.changeText(screen.getByTestId('back'), 'short');
    await fireEvent.press(screen.getByTestId('save-card-save'));
    await waitFor(() => expect(screen.getByText('quiz')).toBeTruthy());
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({
      front: 'the front',
      back: 'short',
      tagNames: ['HSK4'],
    });
  });

  it('DP-64: Cancel saves nothing', async () => {
    const { calls } = await open();
    await screen.findByTestId('back');
    await fireEvent.press(screen.getByTestId('save-card-cancel'));
    await waitFor(() => expect(screen.getByText('quiz')).toBeTruthy());
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('DP-64: nothing to edit any more goes back to the quiz', async () => {
    await open(undefined);
    await waitFor(() => expect(screen.getByText('quiz')).toBeTruthy());
  });
});
