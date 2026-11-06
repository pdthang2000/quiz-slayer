import { randomUUID } from 'node:crypto';
import { AnswerQuiz } from '../../src/daily-practice/application/answer-quiz';
import { ApplyQuizAnswered } from '../../src/daily-practice/application/apply-quiz-answered';
import type { QuizAnswered } from '../../src/daily-practice/domain/events';
import { QuizAlreadyAnswered } from '../../src/daily-practice/domain/errors';
import {
  DailySessionId,
  QuizId,
  TrackId,
  UserId,
} from '../../src/daily-practice/domain/ids';
import { LocalDate } from '../../src/daily-practice/domain/local-date';
import {
  readingGroup,
  single,
  startSession,
} from '../../src/daily-practice/domain/test-data';
import { Track } from '../../src/daily-practice/domain/track';
import {
  PrismaDailySessionRepository,
  PrismaQuizProgressRepository,
  PrismaTrackRepository,
} from '../../src/daily-practice/infrastructure/prisma-practice.repositories';
import { OutboxRelay } from '../../src/prisma/outbox-relay';
import { PrismaTransactionRunner } from '../../src/prisma/prisma-transaction-runner';
import { connectTestDb, resetPracticeDb } from './db';

const prisma = connectTestDb();
const sessions = new PrismaDailySessionRepository(prisma);
const progress = new PrismaQuizProgressRepository(prisma);
const tracks = new PrismaTrackRepository(prisma);
const user = UserId(randomUUID());

/** A relay as a freshly started process: QuizProgress registered as the QuizAnswered handler. */
function startedRelay() {
  const relay = new OutboxRelay(prisma);
  const apply = new ApplyQuizAnswered(progress);
  relay.register('QuizAnswered', (e) => apply.handle(e as QuizAnswered));
  return relay;
}

/** A relay that never gets to deliver: the process dies right after the commit. */
function crashingRelay() {
  const relay = new OutboxRelay(prisma);
  relay.deliverSoon = () => {};
  return relay;
}

const CLOCK = { now: () => new Date('2026-11-07T02:00:00Z') };

const answerQuiz = (relay: OutboxRelay) =>
  new AnswerQuiz(new PrismaTransactionRunner(prisma), sessions, relay, CLOCK);

async function sessionWith(quizIds: { single?: string[]; group?: string }) {
  const track = Track.add({
    id: TrackId(randomUUID()),
    userId: user,
    tagName: 'HSK4',
  });
  await tracks.add(track);
  const quizzes = [
    ...(quizIds.single ?? []).map((id) => single(id)),
    ...(quizIds.group ? [readingGroup(quizIds.group, 3)] : []),
  ];
  const session = startSession(quizzes, {
    id: DailySessionId(randomUUID()),
    userId: user,
    trackId: track.id,
  });
  await sessions.add(session);
  return session;
}

const undelivered = () =>
  prisma.db.outboxEvent.findMany({ where: { deliveredAt: null } });

/** The time a failing event waits has passed. */
const retryDueNow = () =>
  prisma.db.outboxEvent.updateMany({
    where: { deliveredAt: null },
    data: { nextAttemptAt: new Date(0) },
  });

beforeEach(() => resetPracticeDb(prisma));
afterAll(() => prisma.onModuleDestroy());

describe('Outbox (B-10)', () => {
  it('QuizAnswered is saved in the same transaction as the answer', async () => {
    const q = randomUUID();
    const session = await sessionWith({ single: [q, randomUUID()] });
    await answerQuiz(crashingRelay()).execute({
      userId: user,
      sessionId: session.id,
      quizId: QuizId(q),
      choices: [1],
    });
    const events = await undelivered();
    expect(events.map((e) => e.type)).toEqual(['QuizAnswered']);
    expect(events[0].payload).toMatchObject({
      quizId: q,
      correct: false,
      day: '2026-11-07',
    });
  });

  it('a crash between commit and delivery loses nothing: the next relay applies the answer', async () => {
    const q = randomUUID();
    const session = await sessionWith({ single: [q] });
    await answerQuiz(crashingRelay()).execute({
      userId: user,
      sessionId: session.id,
      quizId: QuizId(q),
      choices: [1],
    });
    expect(await progress.find(user, QuizId(q))).toBeNull();

    expect(await startedRelay().deliverPending()).toBe(2); // QuizAnswered + DailySessionFinished
    const p = await progress.find(user, QuizId(q));
    expect(p!.mistake?.dueOn.value).toBe('2026-11-08'); // DP-33: wrong → the next day
    expect(await undelivered()).toEqual([]);
  });

  it('a rejected answer stores no event (rolled back with the session)', async () => {
    const q = randomUUID();
    const session = await sessionWith({ single: [q, randomUUID()] });
    const use = answerQuiz(crashingRelay());
    await use.execute({
      userId: user,
      sessionId: session.id,
      quizId: QuizId(q),
      choices: [0],
    });
    await expect(
      use.execute({
        userId: user,
        sessionId: session.id,
        quizId: QuizId(q),
        choices: [1],
      }),
    ).rejects.toThrow(QuizAlreadyAnswered);
    expect(await prisma.db.outboxEvent.count()).toBe(1);
  });

  it('delivered twice, QuizProgress applies DP-33 once (idempotent)', async () => {
    const q = randomUUID();
    const session = await sessionWith({ single: [q] });
    await answerQuiz(crashingRelay()).execute({
      userId: user,
      sessionId: session.id,
      quizId: QuizId(q),
      choices: [1],
    });
    await startedRelay().deliverPending();
    const first = await progress.find(user, QuizId(q));
    await prisma.db.outboxEvent.updateMany({ data: { deliveredAt: null } }); // e.g. crash before "delivered" was seen
    await startedRelay().deliverPending();
    const second = await progress.find(user, QuizId(q));
    expect(second!.version).toBe(first!.version);
    expect(second!.mistake).toEqual(first!.mistake);
  });

  it('a failing handler leaves the event for the next try and counts the attempt', async () => {
    const q = randomUUID();
    const session = await sessionWith({ single: [q, randomUUID()] });
    await answerQuiz(crashingRelay()).execute({
      userId: user,
      sessionId: session.id,
      quizId: QuizId(q),
      choices: [1],
    });
    const broken = new OutboxRelay(prisma);
    broken.register('QuizAnswered', () => Promise.reject(new Error('boom')));
    expect(await broken.deliverPending()).toBe(0);
    const [row] = await undelivered();
    expect(row).toMatchObject({ attempts: 1, lastError: 'boom' });
    expect(await startedRelay().deliverPending()).toBe(0); // waits for its next attempt
    await retryDueNow();
    expect(await startedRelay().deliverPending()).toBe(1);
  });

  it('a failing event waits with backoff and does not block newer ones', async () => {
    const q1 = randomUUID();
    const q2 = randomUUID();
    const session = await sessionWith({ single: [q1, q2, randomUUID()] });
    const use = answerQuiz(crashingRelay());
    const answer = (q: string) =>
      use.execute({
        userId: user,
        sessionId: session.id,
        quizId: QuizId(q),
        choices: [1],
      });
    await answer(q1);
    await answer(q2);

    const relay = new OutboxRelay(prisma);
    const apply = new ApplyQuizAnswered(progress);
    relay.register('QuizAnswered', (e) => {
      const event = e as QuizAnswered;
      return event.quizId === q1
        ? Promise.reject(new Error('boom'))
        : apply.handle(event);
    });

    const before = Date.now();
    expect(await relay.deliverPending()).toBe(1); // q2 passes the failing q1
    expect(await progress.find(user, QuizId(q2))).not.toBeNull();
    const [first] = await undelivered();
    expect(first.nextAttemptAt.getTime()).toBeGreaterThan(before + 4_000);

    // A second failure waits longer.
    await retryDueNow();
    await relay.deliverPending();
    const [second] = await undelivered();
    expect(second.attempts).toBe(2);
    expect(second.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 8_000);
  });

  it('a full batch of failing events does not stop the run before newer ones', async () => {
    const payload = { type: 'Broken' };
    await prisma.db.outboxEvent.createMany({
      data: Array.from({ length: 50 }, (_, i) => ({
        id: randomUUID(),
        type: 'Broken',
        payload,
        occurredAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)),
        nextAttemptAt: new Date(0),
      })),
    });
    await prisma.db.outboxEvent.create({
      data: {
        id: randomUUID(),
        type: 'Fine',
        payload: { type: 'Fine' },
        nextAttemptAt: new Date(0),
      },
    });
    const relay = new OutboxRelay(prisma);
    relay.register('Broken', () => Promise.reject(new Error('boom')));
    expect(await relay.deliverPending()).toBe(1);
  });

  it('QuizProgress ignores an event older than the last answer it applied', async () => {
    const q = randomUUID();
    const older = await sessionWith({ single: [q] });
    const newer = startSession([single(q)], {
      id: DailySessionId(randomUUID()),
      userId: user,
      trackId: older.trackId,
      day: LocalDate.parse('2026-11-08'),
    });
    await sessions.add(newer);

    const answer = (sessionId: DailySessionId, at: string, choices: number[]) =>
      new AnswerQuiz(
        new PrismaTransactionRunner(prisma),
        sessions,
        crashingRelay(),
        { now: () => new Date(at) },
      ).execute({ userId: user, sessionId, quizId: QuizId(q), choices });
    await answer(older.id, '2026-11-08T02:00:00Z', [1]); // wrong, older
    await answer(newer.id, '2026-11-08T03:00:00Z', [0]); // right, newer

    const relay = new OutboxRelay(prisma);
    const apply = new ApplyQuizAnswered(progress);
    let failOlder = true;
    relay.register('QuizAnswered', (e) => {
      const event = e as QuizAnswered;
      if (failOlder && event.sessionId === older.id)
        return Promise.reject(new Error('boom'));
      return apply.handle(event);
    });
    await relay.deliverPending(); // the newer one passes the failing older one
    failOlder = false;
    await retryDueNow();
    await relay.deliverPending();

    const p = await progress.find(user, QuizId(q));
    expect(p!.mistake).toBeNull(); // the late wrong answer changed nothing
    expect(p!.lastAnsweredAt).toEqual(new Date('2026-11-08T03:00:00Z'));
    expect(await undelivered()).toEqual([]);
  });

  it('DP-29: a group with one wrong question comes back as a whole', async () => {
    const g = randomUUID();
    const session = await sessionWith({ group: g });
    await answerQuiz(startedRelay()).execute({
      userId: user,
      sessionId: session.id,
      quizId: QuizId(g),
      choices: [0, 1, 0],
    });
    await startedRelay().deliverPending();
    expect((await progress.find(user, QuizId(g)))!.mistake?.stage).toBe(1);
  });
});
