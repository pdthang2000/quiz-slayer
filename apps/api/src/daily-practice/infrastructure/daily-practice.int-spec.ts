import { randomUUID } from 'node:crypto';
import { connectTestDb, resetPracticeDb } from '../../../test/int/db';
import {
  DailySessionExists,
  PracticeChanged,
  TrackChanged,
} from '../domain/errors';
import { DailySessionId, QuizId, TrackId, UserId } from '../domain/ids';
import { LocalDate } from '../domain/local-date';
import { QuizProgress } from '../domain/quiz-progress';
import { single, startSession, readingGroup } from '../domain/test-data';
import { Track } from '../domain/track';
import {
  PrismaDailySessionRepository,
  PrismaQuizProgressRepository,
  PrismaTrackRepository,
} from './prisma-practice.repositories';

const prisma = connectTestDb();
const tracks = new PrismaTrackRepository(prisma);
const sessions = new PrismaDailySessionRepository(prisma);
const progress = new PrismaQuizProgressRepository(prisma);

const user = UserId(randomUUID());
const DAY = LocalDate.parse('2026-11-07');
const uuid = () => randomUUID();

async function addTrack(tagName = 'HSK4') {
  const track = Track.add({ id: TrackId(uuid()), userId: user, tagName });
  await tracks.add(track);
  return track;
}

function newSession(trackId: TrackId, quizIds: string[], day = DAY) {
  return startSession(
    quizIds.map((id) => single(id)),
    { id: DailySessionId(uuid()), userId: user, trackId, day },
  );
}

beforeEach(() => resetPracticeDb(prisma));
afterAll(() => prisma.onModuleDestroy());

describe('Daily Practice persistence', () => {
  it('DP-15: a removed track is kept and found by its tag, with its settings', async () => {
    const track = await addTrack();
    const loaded = (await tracks.findById(user, track.id))!;
    loaded.changeSettings({ dailySize: 20, kinds: ['single', 'readingGroup'] });
    loaded.remove();
    await tracks.save(loaded);
    const again = (await tracks.findByTagName(user, 'HSK4'))!;
    expect(again.isActive).toBe(false);
    expect(again.dailySize).toBe(20);
    expect(again.kinds).toEqual(['single', 'readingGroup']);
    expect(again.version).toBe(1);
  });

  it('DP-09: one track per tag; a second add of the same tag fails', async () => {
    await addTrack('HSK4');
    await addTrack('TOEIC');
    await expect(addTrack('HSK4')).rejects.toThrow(PracticeChanged);
  });

  it('a track saved from an outdated copy fails (two devices)', async () => {
    const track = await addTrack();
    const a = (await tracks.findById(user, track.id))!;
    const b = (await tracks.findById(user, track.id))!;
    a.changeSettings({ dailySize: 5 });
    await tracks.save(a);
    b.changeSettings({ dailySize: 6 });
    await expect(tracks.save(b)).rejects.toThrow(TrackChanged);
  });

  it('DP-01: one daily session per user, track and day', async () => {
    const track = await addTrack();
    await sessions.add(newSession(track.id, [uuid()]));
    await expect(sessions.add(newSession(track.id, [uuid()]))).rejects.toThrow(
      DailySessionExists,
    );
    await sessions.add(newSession(track.id, [uuid()], DAY.addDays(1)));
  });

  it('QB-04, DP-22: the snapshot and the answers come back as saved; resume where the user stopped', async () => {
    const track = await addTrack();
    const [a, b] = [uuid(), uuid()];
    const session = startSession(
      [single(a, { explanation: 'why' }), readingGroup(b, 3)],
      {
        id: DailySessionId(uuid()),
        userId: user,
        trackId: track.id,
      },
    );
    await sessions.add(session);
    const loaded = (await sessions.findByDay(user, track.id, DAY))!;
    expect(loaded.quizzes).toEqual(session.quizzes);
    loaded.answerQuiz(QuizId(a), [2], new Date('2026-11-07T02:00:00Z'));
    await sessions.save(loaded);

    const resumed = (await sessions.findById(user, session.id))!;
    expect(resumed.nextQuiz!.id).toBe(b);
    expect(resumed.answerOf(QuizId(a))).toEqual({
      quizId: a,
      choices: [2],
      answeredAt: new Date('2026-11-07T02:00:00Z'),
    });
    expect(resumed.day.value).toBe('2026-11-07');
  });

  it('DP-03: two devices answering the same quiz: the second save fails', async () => {
    const track = await addTrack();
    const q = uuid();
    const session = newSession(track.id, [q, uuid()]);
    await sessions.add(session);
    const phone = (await sessions.findById(user, session.id))!;
    const tablet = (await sessions.findById(user, session.id))!;
    phone.answerQuiz(QuizId(q), [0], new Date());
    await sessions.save(phone);
    tablet.answerQuiz(QuizId(q), [1], new Date());
    await expect(sessions.save(tablet)).rejects.toThrow(PracticeChanged);
  });

  it("DP-39: the quizzes of the user's sessions on a day", async () => {
    const hsk = await addTrack('HSK4');
    const grammar = await addTrack('grammar');
    const [q1, q2, q3] = [uuid(), uuid(), uuid()];
    await sessions.add(newSession(hsk.id, [q1, q2]));
    await sessions.add(newSession(grammar.id, [q3]));
    await sessions.add(newSession(grammar.id, [uuid()], DAY.addDays(-1)));
    expect(await sessions.quizIdsOfDay(user, DAY)).toEqual(
      new Set([q1, q2, q3]),
    );
  });

  it('DP-39: the per-user lock only works inside a transaction', async () => {
    await expect(sessions.lockUserForDay(user)).rejects.toThrow();
    await prisma.runInTransaction(() => sessions.lockUserForDay(user));
  });

  it('DP-33, DP-37: quiz progress is stored per user and quiz with its mistake schedule', async () => {
    const quizId = QuizId(uuid());
    const answered = (day: string, correct: boolean) => ({
      type: 'QuizAnswered' as const,
      sessionId: DailySessionId(uuid()),
      userId: user,
      quizId,
      day,
      answeredAt: `${day}T03:00:00.000Z`,
      correct,
    });
    await progress.add(QuizProgress.firstAnswer(answered('2026-11-02', false)));
    const p = (await progress.find(user, quizId))!;
    expect(p.mistake).toEqual({
      stage: 1,
      dueOn: LocalDate.parse('2026-11-03'),
    });
    p.apply(answered('2026-11-03', true));
    await progress.save(p);
    const [again] = await progress.findMany(user, [quizId]);
    expect(again.mistake).toEqual({
      stage: 3,
      dueOn: LocalDate.parse('2026-11-06'),
    });
    expect(again.isDueOn(LocalDate.parse('2026-11-06'))).toBe(true);
  });
});
