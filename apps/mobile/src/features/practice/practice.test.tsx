import { Alert, type AlertButton } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { DailySession, Quiz, Today, Track } from '../../api/types';
import { fakeApi, type FetchCall, Providers } from '../../test/harness';
import { useTracks } from './hooks';
import { HistoryList } from './HistoryList';
import { SessionView } from './SessionView';
import { TodayView } from './TodayView';
import { AddTrackList, TrackSettings } from './TrackScreens';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useNavigation: () => ({ addListener: () => () => {} }),
  usePreventRemove: (...args: unknown[]) => mockPreventRemove(...args),
}));
jest.mock('expo-localization', () => ({
  ...jest.requireActual('expo-localization'),
  getCalendars: () => [{ timeZone: 'Asia/Ho_Chi_Minh' }],
}));
const mockPreventRemove = jest.fn();
const mockPlay = jest.fn();
const mockSeekTo = jest.fn();
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: mockPlay, seekTo: mockSeekTo }),
}));

const wrap = (ui: React.ReactElement) => render(<Providers>{ui}</Providers>);
const press = (id: string) => fireEvent.press(screen.getByTestId(id));

const today = (over: Partial<Today> = {}): Today => ({
  day: '2026-11-07',
  overallStreak: 4,
  overallBestStreak: 21,
  tracks: [
    {
      id: 't1',
      tagName: 'HSK4',
      kinds: ['single'],
      dailySize: 10,
      version: 0,
      streak: 5,
      session: null,
      yesterdaySession: null,
    },
    {
      id: 't2',
      tagName: 'TOEIC',
      kinds: ['single'],
      dailySize: 10,
      version: 0,
      streak: 2,
      yesterdaySession: null,
      session: {
        id: 's2',
        trackId: 't2',
        day: '2026-11-07',
        short: false,
        finished: false,
        closed: false,
        progress: { answered: 3, total: 10 },
        result: { correct: 3, total: 3 },
      },
    },
  ],
  ...over,
});

const single = (id: string, over: Partial<Quiz> = {}): Quiz => ({
  id,
  kind: 'single',
  questions: [{ id: `${id}-q`, text: `question ${id}`, choices: ['是', '在', '有', '去'] }],
  ...over,
});

const answered = (quiz: Quiz, chosen: number, correctChoice = 0, extra = {}): Quiz => ({
  ...quiz,
  answer: {
    questions: quiz.questions.map((q) => ({
      questionId: q.id,
      chosen,
      correctChoice,
      correct: chosen === correctChoice,
      explanation: '是 = to be',
      canSaveAsCard: chosen !== correctChoice,
      savedAsCard: false,
      note: null,
      noteVersion: 0,
      ...extra,
    })),
  },
});

const session = (quizzes: Quiz[], over: Partial<DailySession> = {}): DailySession => ({
  id: 's1',
  trackId: 't1',
  tagName: 'HSK4',
  day: '2026-11-07',
  dailySize: 10,
  short: false,
  finished: quizzes.every((q) => q.answer),
  closed: false,
  progress: { answered: quizzes.filter((q) => q.answer).length, total: quizzes.length },
  result: { correct: 0, total: quizzes.length },
  quizzes,
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('Today', () => {
  it('DP-60, DP-19: the overall streak on top, each track with its own streak and progress', async () => {
    fakeApi([{ method: 'GET', path: /^\/practice\/today$/, reply: { body: today() } }]);
    await wrap(<TodayView />);
    expect(await screen.findByText('🔥 4 day streak')).toBeTruthy();
    expect(screen.getByTestId('streak-HSK4').props.children).toBe('🔥5');
    expect(screen.getByTestId('progress-HSK4').props.children).toBe('Not started');
    expect(screen.getByTestId('progress-TOEIC').props.children).toBe('3 / 10'); // DP-18 quizzes
  });

  it("DP-05: day-dependent requests send the phone's timezone", async () => {
    const { calls } = fakeApi([{ method: 'GET', path: /^\/practice\/today$/, reply: { body: today() } }]);
    await wrap(<TodayView />);
    await screen.findByText('🔥 4 day streak');
    expect(calls[0].headers['X-Time-Zone']).toBe('Asia/Ho_Chi_Minh');
  });

  it('DP-31: Start chooses the set and opens it; DP-22: Continue resumes without a new set', async () => {
    const { calls } = fakeApi([
      { method: 'GET', path: /^\/practice\/today$/, reply: { body: today() } },
      { method: 'POST', path: /^\/practice\/tracks\/t1\/start$/, reply: { body: session([single('a')], { id: 'new' }) } },
    ]);
    await wrap(<TodayView />);
    await screen.findByText('🔥 4 day streak');
    await press('start-HSK4');
    await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: '/practice/[id]', params: { id: 'new' } }));
    expect(calls.find((c) => c.method === 'POST')!.headers['X-Time-Zone']).toBe('Asia/Ho_Chi_Minh');

    await press('start-TOEIC');
    await waitFor(() => expect(router.push).toHaveBeenLastCalledWith({ pathname: '/practice/[id]', params: { id: 's2' } }));
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1);
  });

  it('DP-56: nothing matching shows the message', async () => {
    fakeApi([
      { method: 'GET', path: /^\/practice\/today$/, reply: { body: today() } },
      { method: 'POST', path: /start$/, reply: { status: 422, body: { error: 'NoQuizzesMatch' } } },
    ]);
    await wrap(<TodayView />);
    await screen.findByText('🔥 4 day streak');
    await press('start-HSK4');
    expect(await screen.findByText('No quizzes match your settings.')).toBeTruthy();
  });

  it('DP-59: with no track yet, Today offers to add one', async () => {
    fakeApi([{ method: 'GET', path: /^\/practice\/today$/, reply: { body: today({ tracks: [], overallStreak: 0 }) } }]);
    await wrap(<TodayView />);
    await press(await screen.findByTestId('add-first-track').then(() => 'add-first-track'));
    expect(router.push).toHaveBeenCalledWith('/tracks/add');
  });
});

describe('Daily session', () => {
  const showSession = () => wrap(<SessionView id="s1" onClose={jest.fn()} />);

  it('DP-61, DP-21, DP-20: Check needs a choice; then right/wrong, the correct answer and the explanation; Next goes on', async () => {
    const a = single('a');
    const b = single('b');
    const { calls } = fakeApi([
      { method: 'GET', path: /^\/practice\/sessions\/s1$/, reply: { body: session([a, b]) } },
      {
        method: 'POST',
        path: /^\/practice\/sessions\/s1\/quizzes\/a\/answer$/,
        reply: { body: session([answered(a, 1), b]) },
      },
    ]);
    await showSession();
    expect(await screen.findByText('question a')).toBeTruthy();
    expect(screen.getByTestId('session-progress').props.children).toBe('1 / 2'); // DP-18
    expect(screen.getByTestId('session-check').props.accessibilityState.disabled).toBe(true);
    await press('choice-a-q-1');
    await press('session-check');
    expect(calls.at(-1)!.body).toEqual({ choices: [1] });
    expect(await screen.findByText('✗ Wrong')).toBeTruthy();
    expect(screen.getByText('Answer: 是')).toBeTruthy();
    expect(screen.getByText('是 = to be')).toBeTruthy();
    await press('session-next');
    expect(screen.getByText('question b')).toBeTruthy();
    expect(screen.getByTestId('session-progress').props.children).toBe('2 / 2');
  });

  it('DP-54, DP-17, DP-03: a reading group shows its passage and is answered as a whole', async () => {
    const g: Quiz = {
      id: 'g',
      kind: 'readingGroup',
      passage: '小王是一家公司的职员。',
      questions: [
        { id: 'g1', text: 'q1', choices: ['x', 'y'] },
        { id: 'g2', text: 'q2', choices: ['x', 'y'] },
      ],
    };
    const { calls } = fakeApi([
      { method: 'GET', path: /sessions\/s1$/, reply: { body: session([g]) } },
      { method: 'POST', path: /quizzes\/g\/answer$/, reply: { body: session([answered(g, 0)]) } },
    ]);
    await showSession();
    expect(await screen.findByText('小王是一家公司的职员。')).toBeTruthy();
    await press('choice-g1-0');
    expect(screen.getByTestId('session-check').props.accessibilityState.disabled).toBe(true);
    await press('choice-g2-1');
    await press('session-check');
    expect(calls.at(-1)!.body).toEqual({ choices: [0, 1] });
  });

  it('DP-22: reopening continues at the first quiz not answered', async () => {
    fakeApi([{ method: 'GET', path: /sessions\/s1$/, reply: { body: session([answered(single('a'), 0), single('b')]) } }]);
    await showSession();
    expect(await screen.findByText('question b')).toBeTruthy();
  });

  it('DP-14: a short set says how many quizzes matched', async () => {
    fakeApi([{ method: 'GET', path: /sessions\/s1$/, reply: { body: session([single('a')], { short: true }) } }]);
    await showSession();
    expect(await screen.findByText('Only 1 quiz matches your settings.')).toBeTruthy();
  });

  it('DP-24: no timer is shown', async () => {
    fakeApi([{ method: 'GET', path: /sessions\/s1$/, reply: { body: session([single('a')]) } }]);
    await showSession();
    await screen.findByText('question a');
    expect(screen.queryByText(/\d+:\d\d/)).toBeNull();
  });

  it('DP-25: audio can be replayed any number of times', async () => {
    fakeApi([
      {
        method: 'GET',
        path: /sessions\/s1$/,
        reply: { body: session([single('au', { kind: 'singleAudio', audioUrl: 'https://x/a.mp3' })]) },
      },
    ]);
    await showSession();
    await press(await screen.findByTestId('quiz-audio').then(() => 'quiz-audio'));
    expect(screen.getByText('↻ Play again')).toBeTruthy();
    await press('quiz-audio');
    await press('quiz-audio');
    expect(mockPlay).toHaveBeenCalledTimes(3);
    expect(mockSeekTo).toHaveBeenLastCalledWith(0);
  });

  it('DP-10: a wrong answer shows "Save as card" right in its feedback', async () => {
    const a = single('a');
    fakeApi([
      { method: 'GET', path: /sessions\/s1$/, reply: { body: session([a, single('b')]) } },
      { method: 'POST', path: /quizzes\/a\/answer$/, reply: { body: session([answered(a, 1), single('b')]) } },
    ]);
    await showSession();
    await press(await screen.findByTestId('choice-a-q-1').then(() => 'choice-a-q-1'));
    await press('session-check');
    expect(await screen.findByTestId('save-as-card-a-q')).toBeTruthy();
  });

  it('DP-40: no "Save as card" button when the server says it is not allowed', async () => {
    const a = single('a');
    fakeApi([
      { method: 'GET', path: /sessions\/s1$/, reply: { body: session([answered(a, 1, 0, { canSaveAsCard: false })]) } },
      { method: 'GET', path: /^\/practice\/today$/, reply: { body: today() } },
    ]);
    await showSession();
    await screen.findByTestId('session-result');
    expect(screen.queryByTestId('save-as-card-a-q')).toBeNull();
  });

  it('DP-23, DP-18: a finished set shows the result in questions and every answer', async () => {
    const a = answered(single('a'), 0);
    const b = answered(single('b'), 2);
    fakeApi([
      {
        method: 'GET',
        path: /sessions\/s1$/,
        reply: { body: session([a, b], { result: { correct: 23, total: 28 } }) },
      },
      { method: 'GET', path: /^\/practice\/today$/, reply: { body: today() } },
    ]);
    await showSession();
    expect(await screen.findByText('23 / 28 correct')).toBeTruthy();
    expect(screen.getByText('question a')).toBeTruthy();
    expect(screen.getByText('question b')).toBeTruthy();
    expect(screen.getByText('✓ Correct')).toBeTruthy();
  });

  it('DP-32: "Save as card" on the result list creates the card once and then shows "Saved ✓"', async () => {
    let saved = false;
    const a = single('a');
    const { calls } = fakeApi([
      {
        method: 'GET',
        path: /sessions\/s1$/,
        reply: () => ({
          body: session([answered(a, 1, 0, saved ? { savedAsCard: true, canSaveAsCard: false } : {})]),
        }),
      },
      { method: 'GET', path: /^\/practice\/today$/, reply: { body: today() } },
      {
        method: 'POST',
        path: /questions\/a-q\/save-as-card$/,
        reply: () => {
          saved = true;
          return { status: 201, body: { cardId: 'c1' } };
        },
      },
    ]);
    await showSession();
    await press(await screen.findByTestId('save-as-card-a-q').then(() => 'save-as-card-a-q'));
    expect(await screen.findByText('Saved ✓')).toBeTruthy();
    expect(screen.queryByTestId('save-as-card-a-q')).toBeNull();
    expect(calls.filter((c: FetchCall) => c.method === 'POST')).toHaveLength(1);
  });
});

describe('History', () => {
  it('DP-26: past days with their result, newest first; a tap opens that day', async () => {
    fakeApi([
      {
        method: 'GET',
        path: /^\/practice\/tracks\/t1\/history$/,
        reply: {
          body: [
            { id: 's8', trackId: 't1', day: '2026-11-08', short: false, finished: true, progress: { answered: 2, total: 2 }, result: { correct: 2, total: 2 } },
            { id: 's7', trackId: 't1', day: '2026-11-07', short: false, finished: true, progress: { answered: 2, total: 2 }, result: { correct: 1, total: 2 } },
          ],
        },
      },
    ]);
    await wrap(<HistoryList trackId="t1" />);
    expect(await screen.findByText('2 / 2')).toBeTruthy();
    expect(screen.getByText('1 / 2')).toBeTruthy();
    await press('day-2026-11-07');
    expect(router.push).toHaveBeenCalledWith({ pathname: '/practice/[id]', params: { id: 's7' } });
  });
});

describe('Review fixes (6e.1)', () => {
  const summary = (over = {}) => ({
    id: 's6',
    trackId: 't1',
    day: '2026-11-06',
    short: false,
    finished: false,
    closed: false,
    progress: { answered: 3, total: 10 },
    result: { correct: 2, total: 3 },
    ...over,
  });

  it('DP-69: Today shows "Best 21" under the overall streak', async () => {
    fakeApi([{ method: 'GET', path: /^\/practice\/today$/, reply: { body: today() } }]);
    await wrap(<TodayView />);
    expect(await screen.findByText('Best 21')).toBeTruthy();
  });

  it('DP-69: from 1 on Today shows "Best 1"', async () => {
    fakeApi([{ method: 'GET', path: /^\/practice\/today$/, reply: { body: today({ overallBestStreak: 1 }) } }]);
    await wrap(<TodayView />);
    expect(await screen.findByText('Best 1')).toBeTruthy();
  });

  it('DP-69: Today hides the best streak while it is 0', async () => {
    fakeApi([{ method: 'GET', path: /^\/practice\/today$/, reply: { body: today({ overallBestStreak: 0 }) } }]);
    await wrap(<TodayView />);
    await screen.findByTestId('overall-streak');
    expect(screen.queryByTestId('overall-best')).toBeNull();
  });

  it('DP-63: "Finish yesterday\'s set · 3 / 10" under its track; Continue opens that set', async () => {
    const base = today();
    const tracks = [{ ...base.tracks[0], yesterdaySession: summary() }, base.tracks[1]];
    fakeApi([{ method: 'GET', path: /^\/practice\/today$/, reply: { body: today({ tracks }) } }]);
    await wrap(<TodayView />);
    expect(await screen.findByText("Finish yesterday's set · 3 / 10")).toBeTruthy();
    expect(screen.queryByTestId('yesterday-TOEIC')).toBeNull();
    await press('continue-yesterday-HSK4');
    expect(router.push).toHaveBeenCalledWith({ pathname: '/practice/[id]', params: { id: 's6' } });
  });

  it('DP-52: a closed set opens view only: answered quizzes, no more answers', async () => {
    const closed = session([answered(single('a'), 0), single('b')], {
      finished: false,
      closed: true,
    });
    fakeApi([
      { method: 'GET', path: /^\/practice\/sessions\/s1$/, reply: { body: closed } },
      { method: 'GET', path: /^\/practice\/today$/, reply: { body: today() } },
    ]);
    await wrap(<SessionView id="s1" onClose={jest.fn()} />);
    expect(await screen.findByTestId('session-result')).toBeTruthy();
    expect(screen.getByTestId('session-title').props.children).toBe('This day is over.');
    expect(screen.getByText('question a')).toBeTruthy();
    expect(screen.queryByText('question b')).toBeNull();
    expect(screen.queryByTestId('session-check')).toBeNull();
  });

  it('DP-52: answering after the day closed shows the message and reloads to view only', async () => {
    const open = session([single('a')]);
    const closed = session([single('a')], { finished: false, closed: true });
    let reads = 0;
    fakeApi([
      {
        method: 'GET',
        path: /^\/practice\/sessions\/s1$/,
        reply: () => ({ body: reads++ === 0 ? open : closed }),
      },
      { method: 'GET', path: /^\/practice\/today$/, reply: { body: today() } },
      { method: 'POST', path: /answer$/, reply: { status: 409, body: { error: 'DailySessionClosed' } } },
    ]);
    await wrap(<SessionView id="s1" onClose={jest.fn()} />);
    await screen.findByTestId('choice-a-q-0');
    await press('choice-a-q-0');
    await press('session-check');
    expect(await screen.findByTestId('session-result')).toBeTruthy();
    expect(screen.getAllByText('This day is over.').length).toBeGreaterThan(0);
  });

  it("DP-05, DP-33: answering and reading a session send the phone's timezone", async () => {
    const { calls } = fakeApi([
      { method: 'GET', path: /^\/practice\/sessions\/s1$/, reply: { body: session([single('a')]) } },
      { method: 'POST', path: /answer$/, reply: { body: session([answered(single('a'), 0)]) } },
      { method: 'GET', path: /^\/practice\/today$/, reply: { body: today() } },
    ]);
    await wrap(<SessionView id="s1" onClose={jest.fn()} />);
    await screen.findByTestId('choice-a-q-0');
    await press('choice-a-q-0');
    await press('session-check');
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    expect(calls.every((c) => c.headers['X-Time-Zone'] === 'Asia/Ho_Chi_Minh')).toBe(true);
  });

  it('DP-69: the History header shows the best streak', async () => {
    fakeApi([
      { method: 'GET', path: /tracks\/t1\/history$/, reply: { body: [] } },
      { method: 'GET', path: /tracks\/t1\/best-streak$/, reply: { body: { bestStreak: 12 } } },
    ]);
    await wrap(<HistoryList trackId="t1" />);
    expect(await screen.findByText('Best: 12 days')).toBeTruthy();
  });

  it('DP-69: the History header reads "Best: 1 day" at 1', async () => {
    fakeApi([
      { method: 'GET', path: /tracks\/t1\/history$/, reply: { body: [] } },
      { method: 'GET', path: /tracks\/t1\/best-streak$/, reply: { body: { bestStreak: 1 } } },
    ]);
    await wrap(<HistoryList trackId="t1" />);
    expect(await screen.findByText('Best: 1 day')).toBeTruthy();
  });

  it('DP-69: the History header hides the best streak while it is 0', async () => {
    const { calls } = fakeApi([
      { method: 'GET', path: /tracks\/t1\/history$/, reply: { body: [] } },
      { method: 'GET', path: /tracks\/t1\/best-streak$/, reply: { body: { bestStreak: 0 } } },
    ]);
    await wrap(<HistoryList trackId="t1" />);
    await screen.findByText('No days yet.');
    await waitFor(() => expect(calls.some((c) => c.path.endsWith('best-streak'))).toBe(true));
    await act(async () => {});
    expect(screen.queryByTestId('history-best')).toBeNull();
  });
});

describe('Notes', () => {
  /** The user picks a button in the "Discard your note?" dialog. */
  const answerDialog = (button: string) =>
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons?: AlertButton[]) =>
        buttons?.find((b) => b.text === button)?.onPress?.(),
      );
  const openSession = async (s: DailySession, routes: Parameters<typeof fakeApi>[0] = []) => {
    const api = fakeApi([
      { method: 'GET', path: /^\/practice\/sessions\/s1$/, reply: { body: s } },
      { method: 'GET', path: /^\/practice\/today$/, reply: { body: today() } },
      ...routes,
    ]);
    await wrap(<SessionView id="s1" onClose={onClose} />);
    await screen.findByTestId('quiz-a');
    return api;
  };
  const onClose = jest.fn();
  const NOTE = /questions\/a-q\/note$/;

  beforeEach(() => {
    onClose.mockClear();
    mockPreventRemove.mockClear();
  });

  it('DP-45: no note box before answering', async () => {
    await openSession(session([single('a')]));
    expect(screen.queryByTestId('note-add-a-q')).toBeNull();
  });

  it('DP-66: no note: "📝 Add note" opens a box with Save, Cancel and the counter', async () => {
    await openSession(session([answered(single('a'), 1)]));
    await waitFor(() => expect(screen.getByText('📝 Add note')).toBeTruthy());
    await press('note-add-a-q');
    expect(screen.getByTestId('note-counter-a-q').props.children).toBe('0 / 1,000');
    await fireEvent.changeText(screen.getByTestId('note-input-a-q'), 'a'.repeat(120));
    expect(screen.getByTestId('note-counter-a-q').props.children).toBe('120 / 1,000');
    await press('note-cancel-a-q');
    expect(screen.getByText('📝 Add note')).toBeTruthy();
  });

  it('DP-66: a note shows its text with Edit, ready to change', async () => {
    await openSession(session([answered(single('a'), 1, 0, { note: 'mine', noteVersion: 2 })]));
    expect(screen.getByText('mine')).toBeTruthy();
    await press('note-edit-a-q');
    expect(screen.getByTestId('note-input-a-q').props.value).toBe('mine');
  });

  it('DP-66: over 1,000 the counter turns red and Save is off', async () => {
    await openSession(session([answered(single('a'), 1)]));
    await waitFor(() => expect(screen.getByTestId('note-add-a-q')).toBeTruthy());
    await press('note-add-a-q');
    await fireEvent.changeText(screen.getByTestId('note-input-a-q'), 'a'.repeat(1001));
    expect(screen.getByTestId('note-counter-a-q').props.children).toBe('1,001 / 1,000');
    expect(screen.getByTestId('note-save-a-q').props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByTestId('note-input-a-q'), 'a'.repeat(1000));
    expect(screen.getByTestId('note-save-a-q').props.accessibilityState.disabled).toBe(false);
  });

  it('DP-47, DP-50: saved only with Save, sending the version the screen showed', async () => {
    let saved = false;
    const shown = (note: string | null) =>
      session([answered(single('a'), 1, 0, { note, noteVersion: 2 })]);
    const { calls } = fakeApi([
      {
        method: 'GET',
        path: /^\/practice\/sessions\/s1$/,
        reply: () => ({ body: shown(saved ? 'new' : 'old') }),
      },
      {
        method: 'PUT',
        path: NOTE,
        reply: () => {
          saved = true;
          return { body: { text: 'new', version: 3 } };
        },
      },
    ]);
    await wrap(<SessionView id="s1" onClose={onClose} />);
    await screen.findByText('old');
    await press('note-edit-a-q');
    await fireEvent.changeText(screen.getByTestId('note-input-a-q'), 'new');
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
    await press('note-save-a-q');
    expect(await screen.findByText('new')).toBeTruthy();
    const put = calls.find((c) => c.method === 'PUT')!;
    expect(put.ifMatch).toBe('"2"');
    expect(put.body).toEqual({ text: 'new' });
  });

  it('DP-50: outdated → "This note changed." and the latest note shows', async () => {
    let reads = 0;
    const shown = (note: string, noteVersion: number) =>
      session([answered(single('a'), 1, 0, { note, noteVersion })]);
    fakeApi([
      {
        method: 'GET',
        path: /^\/practice\/sessions\/s1$/,
        reply: () => ({ body: reads++ === 0 ? shown('old', 1) : shown('X', 2) }),
      },
      { method: 'PUT', path: NOTE, reply: { status: 409, body: { error: 'NoteChanged' } } },
    ]);
    await wrap(<SessionView id="s1" onClose={onClose} />);
    await screen.findByText('old');
    await press('note-edit-a-q');
    await fireEvent.changeText(screen.getByTestId('note-input-a-q'), 'Y');
    await press('note-save-a-q');
    expect(await screen.findByText('This note changed.')).toBeTruthy();
    expect(await screen.findByText('X')).toBeTruthy();
  });

  it('DP-68: a closed set from History: answers locked, the note can still be edited', async () => {
    await openSession(
      session([answered(single('a'), 1, 0, { note: 'mine', noteVersion: 1 }), single('b')], {
        finished: false,
        closed: true,
      }),
    );
    expect(screen.getByTestId('session-result')).toBeTruthy();
    await press('note-edit-a-q');
    expect(screen.getByTestId('note-save-a-q')).toBeTruthy();
  });

  it('DP-67: Next with a typed note asks; Keep editing stays', async () => {
    const alert = answerDialog('Keep editing');
    await openSession(session([single('a'), single('b')]), [
      {
        method: 'POST',
        path: /answer$/,
        reply: { body: session([answered(single('a'), 1), single('b')], { finished: false }) },
      },
    ]);
    await press('choice-a-q-1');
    await press('session-check');
    await press('note-add-a-q');
    await fireEvent.changeText(screen.getByTestId('note-input-a-q'), 'typed');
    await press('session-next');
    expect(alert.mock.calls.at(-1)![0]).toBe('Discard your note?');
    expect(screen.getByTestId('quiz-a')).toBeTruthy();
    alert.mockRestore();
  });

  it('DP-67: Next with a typed note asks; Discard goes on', async () => {
    const alert = answerDialog('Discard');
    await openSession(session([single('a'), single('b')]), [
      {
        method: 'POST',
        path: /answer$/,
        reply: { body: session([answered(single('a'), 1), single('b')], { finished: false }) },
      },
    ]);
    await press('choice-a-q-1');
    await press('session-check');
    await press('note-add-a-q');
    await fireEvent.changeText(screen.getByTestId('note-input-a-q'), 'typed');
    await press('session-next');
    expect(await screen.findByTestId('quiz-b')).toBeTruthy();
    alert.mockRestore();
  });

  it('DP-67: Close with a typed note asks; Discard leaves', async () => {
    const alert = answerDialog('Discard');
    await openSession(session([answered(single('a'), 1)]));
    await press('note-add-a-q');
    await fireEvent.changeText(screen.getByTestId('note-input-a-q'), 'typed');
    await press('session-close');
    expect(alert.mock.calls.at(-1)![0]).toBe('Discard your note?');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    alert.mockRestore();
  });

  it('DP-67: Close with nothing typed leaves without asking', async () => {
    const alert = answerDialog('Discard');
    await openSession(session([answered(single('a'), 1)]));
    await press('note-add-a-q');
    await press('session-close');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(alert).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('DP-67: Back with a typed note is held until Discard', async () => {
    const alert = answerDialog('Discard');
    await openSession(session([answered(single('a'), 1)]));
    await press('note-add-a-q');
    expect(mockPreventRemove.mock.lastCall![0]).toBe(false);
    await fireEvent.changeText(screen.getByTestId('note-input-a-q'), 'typed');
    const [held, onBack] = mockPreventRemove.mock.lastCall!;
    expect(held).toBe(true);
    const repeat = jest.fn();
    await act(async () => onBack({ repeat }));
    expect(alert.mock.calls.at(-1)![0]).toBe('Discard your note?');
    expect(repeat).toHaveBeenCalled();
    alert.mockRestore();
  });

  it('DP-64: a card that fits saves with one tap', async () => {
    const { calls } = await openSession(session([answered(single('a'), 1)]), [
      { method: 'POST', path: /save-as-card$/, reply: { status: 201, body: { cardId: 'c1' } } },
    ]);
    await press('save-as-card-a-q');
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    expect(router.push).not.toHaveBeenCalledWith(expect.objectContaining({ pathname: '/practice/save-card' }));
  });

  it("DP-64: a card that doesn't fit opens the card editor and saves nothing yet", async () => {
    const cardDraft = { front: 'f', back: 'b'.repeat(3400), tagName: 'HSK4' };
    const { calls } = await openSession(
      session([answered(single('a'), 1, 0, { cardDraft })]),
    );
    await press('save-as-card-a-q');
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/practice/save-card',
      params: { sessionId: 's1', questionId: 'a-q' },
    });
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });
});

describe('Tracks', () => {
  const track: Track = { id: 't1', tagName: 'HSK4', kinds: ['single', 'readingGroup'], dailySize: 10, version: 4 };

  it('DP-59: a track is added from question tags with quiz counts; ones already added are greyed', async () => {
    const onAdded = jest.fn();
    const { calls } = fakeApi([
      {
        method: 'GET',
        path: /^\/practice\/track-options$/,
        reply: { body: [{ name: 'HSK4', quizCount: 41, tracked: true }, { name: 'sample', quizCount: 41, tracked: false }] },
      },
      { method: 'POST', path: /^\/practice\/tracks$/, reply: { status: 201, body: track } },
    ]);
    await wrap(<AddTrackList onAdded={onAdded} />);
    expect(await screen.findByText('41 quizzes')).toBeTruthy();
    expect(screen.getByText('Added')).toBeTruthy();
    expect(screen.getByTestId('option-HSK4').props.accessibilityState.disabled).toBe(true);
    await press('option-sample');
    await waitFor(() => expect(onAdded).toHaveBeenCalled());
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({ tagName: 'sample' });
  });

  it('DP-12, DP-13: daily size and kinds are saved together; applies from the next set', async () => {
    const { calls } = fakeApi([{ method: 'PATCH', path: /^\/practice\/tracks\/t1$/, reply: { body: track } }]);
    await wrap(<TrackSettings track={track} onRemoved={jest.fn()} />);
    expect(screen.getByTestId('track-save').props.accessibilityState.disabled).toBe(true);
    await press('size-plus');
    await press('kind-audioGroup');
    await press('track-save');
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].body).toEqual({ kinds: ['single', 'readingGroup', 'audioGroup'], dailySize: 11 });
    expect(await screen.findByText('Settings saved. They apply from the next daily set.')).toBeTruthy();
  });

  it('DP-12: the server refuses no kind at all; its message is shown', async () => {
    fakeApi([{ method: 'PATCH', path: /tracks\/t1$/, reply: { status: 400, body: { error: 'InvalidTrackKinds' } } }]);
    await wrap(<TrackSettings track={{ ...track, kinds: ['single'] }} onRemoved={jest.fn()} />);
    await press('kind-single');
    await press('track-save');
    expect(await screen.findByText('Pick at least one kind')).toBeTruthy();
  });

  it('DP-15: Remove asks first and keeps the history', async () => {
    // The user taps "Remove" in the dialog.
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons?: AlertButton[]) =>
        buttons?.find((b) => b.text === 'Remove')?.onPress?.(),
      );
    const onRemoved = jest.fn();
    const { calls } = fakeApi([{ method: 'DELETE', path: /^\/practice\/tracks\/t1$/, reply: { status: 204 } }]);
    await wrap(<TrackSettings track={track} onRemoved={onRemoved} />);
    await press('track-remove');
    expect(alert.mock.calls.at(-1)![0]).toBe('Remove #HSK4? Its history is kept.');
    await waitFor(() => expect(onRemoved).toHaveBeenCalled());
    expect(calls[0].method).toBe('DELETE');
    alert.mockRestore();
  });

  it('DP-53: settings and remove send the version the screen showed', async () => {
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons?: AlertButton[]) =>
        buttons?.find((b) => b.text === 'Remove')?.onPress?.(),
      );
    const onRemoved = jest.fn();
    const { calls } = fakeApi([
      { method: 'PATCH', path: /tracks\/t1$/, reply: { body: track } },
      { method: 'DELETE', path: /tracks\/t1$/, reply: { status: 204 } },
    ]);
    await wrap(<TrackSettings track={track} onRemoved={onRemoved} />);
    await press('size-plus');
    await press('track-save');
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].ifMatch).toBe('"4"');
    await press('track-remove');
    await waitFor(() => expect(onRemoved).toHaveBeenCalled());
    expect(calls[1].ifMatch).toBe('"4"');
    alert.mockRestore();
  });

  it('DP-53: outdated → "This track changed." and the screen reloads the track', async () => {
    const { calls } = fakeApi([
      { method: 'PATCH', path: /tracks\/t1$/, reply: { status: 409, body: { error: 'TrackChanged' } } },
      { method: 'GET', path: /^\/practice\/tracks$/, reply: { body: [track] } },
    ]);
    const List = () => {
      useTracks();
      return <TrackSettings track={track} onRemoved={jest.fn()} />;
    };
    await wrap(<List />);
    await waitFor(() => expect(calls.filter((c) => c.method === 'GET')).toHaveLength(1));
    await press('size-plus');
    await press('track-save');
    expect(await screen.findByText('This track changed.')).toBeTruthy();
    await waitFor(() => expect(calls.filter((c) => c.method === 'GET')).toHaveLength(2));
  });
});
