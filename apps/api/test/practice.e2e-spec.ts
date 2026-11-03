import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import type {
  DailySessionView,
  QuizView,
} from '../src/daily-practice/application/views';
import type { TodayView } from '../src/daily-practice/application/queries';
import { OutboxRelay } from '../src/prisma/outbox-relay';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  type ImportFile,
  ImportQuizSet,
} from '../src/question-bank/application/import-quiz-set';
import { CLOCK } from '../src/shared/application/clock';
import { resetDb, resetPracticeDb } from './int/db';

const TZ = 'Asia/Ho_Chi_Minh'; // UTC+7
const SEED = join(__dirname, '../prisma/seed/questions/hsk4-sample.json');

/** Local time in Hanoi → the instant the server sees. */
const hanoi = (local: string) =>
  new Date(new Date(`${local}Z`).getTime() - 7 * 3600_000);

describe('Daily Practice (e2e)', () => {
  let app: INestApplication<App>;
  let now = hanoi('2026-11-07T08:00:00');
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLOCK)
      .useValue({ now: () => now })
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(() => app.close());

  beforeEach(async () => {
    const prisma = app.get(PrismaService);
    await resetPracticeDb(prisma);
    await resetDb(prisma);
    await app
      .get(ImportQuizSet)
      .execute(JSON.parse(readFileSync(SEED, 'utf8')) as ImportFile);
    now = hanoi('2026-11-07T08:00:00');
  });

  const deliver = () => app.get(OutboxRelay).deliverPending();

  async function addTrack(
    tagName = 'HSK4',
    settings?: { kinds?: string[]; dailySize?: number },
  ) {
    const res = await http()
      .post('/practice/tracks')
      .send({ tagName })
      .expect(201);
    const id = (res.body as { id: string }).id;
    if (settings)
      await http().patch(`/practice/tracks/${id}`).send(settings).expect(200);
    return id;
  }
  const today = async () =>
    (await http().get('/practice/today').set('X-Time-Zone', TZ).expect(200))
      .body as TodayView;
  const start = async (trackId: string) =>
    (
      await http()
        .post(`/practice/tracks/${trackId}/start`)
        .set('X-Time-Zone', TZ)
        .expect(200)
    ).body as DailySessionView;
  /** Answers one quiz with one choice per question. */
  const answer = (s: { id: string }, quiz: QuizView, choices: number[]) =>
    http()
      .post(`/practice/sessions/${s.id}/quizzes/${quiz.id}/answer`)
      .send({ choices });
  const keyOf = (s: DailySessionView, quizId: string) => {
    const quiz = s.quizzes.find((q) => q.id === quizId)!;
    return quiz.answer!.questions.map((q) => q.correctChoice);
  };
  /** Answers every quiz: `wrong` quiz ids get a wrong answer, the rest right. Learns keys by answering. */
  async function finish(session: DailySessionView, wrong: string[] = []) {
    let s = session;
    for (const quiz of session.quizzes) {
      if (s.quizzes.find((q) => q.id === quiz.id)!.answer) continue;
      // The app never sees the key before answering (DP-20); the test reads it from the DB.
      const prisma = app.get(PrismaService);
      const questions = await prisma.db.question.findMany({
        where: { quizId: quiz.id },
        orderBy: { position: 'asc' },
      });
      const choices = questions.map((q) =>
        wrong.includes(quiz.id)
          ? (q.correctChoice + 1) % q.choices.length
          : q.correctChoice,
      );
      s = (await answer(s, quiz, choices).expect(200)).body as DailySessionView;
    }
    return s;
  }

  it("DP-31: no set exists until Start is tapped; then today's set is chosen", async () => {
    const track = await addTrack();
    expect((await today()).tracks[0].session).toBeNull();
    const s = await start(track);
    expect(s.quizzes).toHaveLength(10);
    expect((await today()).tracks[0].session).toMatchObject({
      id: s.id,
      progress: { answered: 0, total: 10 },
    });
  });

  it('DP-22: Start again the same day resumes the same set where the user stopped', async () => {
    const track = await addTrack();
    const s = await start(track);
    const prisma = app.get(PrismaService);
    const [q] = await prisma.db.question.findMany({
      where: { quizId: s.quizzes[0].id },
    });
    await answer(s, s.quizzes[0], [q.correctChoice]).expect(200);
    const again = await start(track);
    expect(again.id).toBe(s.id);
    expect(again.progress).toEqual({ answered: 1, total: 10 });
  });

  it('DP-20: after a quiz the correct answer and explanation are shown; never before', async () => {
    const s = await start(
      await addTrack('HSK4', { kinds: ['single'], dailySize: 2 }),
    );
    expect(JSON.stringify(s.quizzes)).not.toContain('correctChoice');
    const quiz = s.quizzes[0];
    const after = (await answer(s, quiz, [0]).expect(200))
      .body as DailySessionView;
    const shown = after.quizzes[0].answer!.questions[0];
    expect(shown).toMatchObject({
      chosen: 0,
      correctChoice: expect.any(Number),
      explanation: expect.any(String),
    });
    expect(after.quizzes[1].answer).toBeUndefined();
    expect(JSON.stringify(after.quizzes[1])).not.toContain('correctChoice');
  });

  it("DP-21: quizzes are answered in order; DP-03: an answer can't change", async () => {
    const s = await start(
      await addTrack('HSK4', { kinds: ['single'], dailySize: 3 }),
    );
    const outOfOrder = await answer(s, s.quizzes[1], [0]).expect(409);
    expect(outOfOrder.body.error).toBe('QuizOutOfOrder');
    await answer(s, s.quizzes[0], [0]).expect(200);
    const again = await answer(s, s.quizzes[0], [1]).expect(409);
    expect(again.body.error).toBe('QuizAlreadyAnswered');
  });

  it('DP-07: every question is multiple choice with 2–6 choices', async () => {
    const s = await start(await addTrack());
    for (const quiz of s.quizzes) {
      for (const q of quiz.questions) {
        expect(q.choices.length).toBeGreaterThanOrEqual(2);
        expect(q.choices.length).toBeLessThanOrEqual(6);
      }
    }
  });

  it('DP-14: fewer matching quizzes than the daily size → what is there, marked short', async () => {
    const s = await start(
      await addTrack('HSK4', { kinds: ['readingGroup'], dailySize: 10 }),
    );
    expect(s.quizzes).toHaveLength(3);
    expect(s.short).toBe(true);
  });

  it('DP-14: nothing matches at all → no set (G-9)', async () => {
    const track = await addTrack('HSK4', { kinds: ['audioGroup'] });
    const res = await http()
      .post(`/practice/tracks/${track}/start`)
      .set('X-Time-Zone', TZ)
      .expect(422);
    expect(res.body.error).toBe('NoQuizzesMatch');
  });

  it('DP-12: daily size outside 1–50 or no kind is refused', async () => {
    const track = await addTrack();
    expect(
      (
        await http()
          .patch(`/practice/tracks/${track}`)
          .send({ dailySize: 51 })
          .expect(400)
      ).body.error,
    ).toBe('InvalidDailySize');
    expect(
      (
        await http()
          .patch(`/practice/tracks/${track}`)
          .send({ kinds: [] })
          .expect(400)
      ).body.error,
    ).toBe('InvalidTrackKinds');
  });

  it("DP-13: settings changed after today's set started apply from the next set", async () => {
    const track = await addTrack('HSK4', { dailySize: 4 });
    const s = await start(track);
    await http()
      .patch(`/practice/tracks/${track}`)
      .send({ dailySize: 6 })
      .expect(200);
    expect((await start(track)).quizzes).toHaveLength(4);
    expect(s.dailySize).toBe(4);
    now = hanoi('2026-11-08T08:00:00');
    expect((await start(track)).quizzes).toHaveLength(6);
  });

  it('DP-05: a session started 23:55 and finished 00:05 counts for the day it started', async () => {
    const track = await addTrack('HSK4', { kinds: ['single'], dailySize: 2 });
    now = hanoi('2026-11-07T23:55:00');
    const s = await start(track);
    now = hanoi('2026-11-08T00:05:00');
    const done = await finish(s);
    expect(done.finished).toBe(true);
    expect(done.day).toBe('2026-11-07');
    const sunday = await today();
    expect(sunday.day).toBe('2026-11-08');
    expect(sunday.tracks[0].session).toBeNull();
    expect(sunday.overallStreak).toBe(1);
  });

  it("DP-05: the day needs the phone's timezone", async () => {
    const res = await http().get('/practice/today').expect(400);
    expect(res.body.error).toBe('InvalidTimeZone');
  });

  it('DP-19, DP-23: a finished set (whatever the score) extends the track and the overall streak', async () => {
    const track = await addTrack('HSK4', { kinds: ['single'], dailySize: 2 });
    const s = await start(track);
    await finish(
      s,
      s.quizzes.map((q) => q.id),
    ); // all wrong
    const t = await today();
    expect(t.tracks[0].streak).toBe(1);
    expect(t.overallStreak).toBe(1);
  });

  it('DP-06: a missed day is gone and the streak restarts', async () => {
    const track = await addTrack('HSK4', { kinds: ['single'], dailySize: 1 });
    await finish(await start(track)); // Sat
    now = hanoi('2026-11-09T08:00:00'); // Mon (Sun missed)
    expect((await today()).tracks[0].streak).toBe(0);
    await finish(await start(track));
    expect((await today()).tracks[0].streak).toBe(1);
  });

  it('DP-08, DP-33: a quiz answered wrong comes back the next day, first in the set (DP-30)', async () => {
    const track = await addTrack('HSK4', { kinds: ['single'], dailySize: 4 });
    const s = await start(track);
    const missed = s.quizzes[2].id;
    await finish(s, [missed]);
    await deliver();
    now = hanoi('2026-11-08T08:00:00');
    const next = await start(track);
    expect(next.quizzes[0].id).toBe(missed);
    expect(next.quizzes.slice(1).map((q) => q.id)).not.toContain(
      s.quizzes[0].id,
    ); // new ones (DP-08)
  });

  it('DP-09, DP-39: two tracks at once; a quiz is in at most one set per day', async () => {
    const hsk = await addTrack('HSK4', { dailySize: 30 });
    const sample = await addTrack('sample', { dailySize: 30 }); // the same 41 quizzes
    const a = await start(hsk);
    const b = await start(sample);
    expect(a.quizzes).toHaveLength(30);
    expect(b.quizzes).toHaveLength(11);
    expect(b.short).toBe(true);
    const overlap = b.quizzes.filter((q) =>
      a.quizzes.some((x) => x.id === q.id),
    );
    expect(overlap).toEqual([]);
    expect((await today()).tracks.map((t) => t.tagName)).toEqual([
      'HSK4',
      'sample',
    ]);
  });

  it('DP-15: removing a track keeps its history; adding the tag again continues it', async () => {
    const track = await addTrack('HSK4', { kinds: ['single'], dailySize: 1 });
    await finish(await start(track));
    await http().delete(`/practice/tracks/${track}`).expect(204);
    expect((await today()).tracks).toEqual([]);
    expect(
      (await http().get(`/practice/tracks/${track}/history`).expect(200)).body,
    ).toHaveLength(1);
    const again = await addTrack('HSK4');
    expect(again).toBe(track);
    expect((await today()).tracks[0]).toMatchObject({
      id: track,
      streak: 1,
      dailySize: 1,
    });
  });

  it('DP-26: history lists past days newest first with their result; a day shows the answers', async () => {
    const track = await addTrack('HSK4', { kinds: ['single'], dailySize: 2 });
    const sat = await start(track);
    await finish(sat, [sat.quizzes[0].id]);
    now = hanoi('2026-11-08T08:00:00');
    await finish(await start(track));
    const history = (
      await http().get(`/practice/tracks/${track}/history`).expect(200)
    ).body as {
      id: string;
      day: string;
      result: { correct: number; total: number };
    }[];
    expect(history.map((h) => [h.day, h.result])).toEqual([
      ['2026-11-08', { correct: 2, total: 2 }],
      ['2026-11-07', { correct: 1, total: 2 }],
    ]);
    const day = (
      await http().get(`/practice/sessions/${history[1].id}`).expect(200)
    ).body as DailySessionView;
    expect(day.quizzes[0].answer!.questions[0].correct).toBe(false);
  });

  it('DP-18: progress counts quizzes, the result counts questions', async () => {
    const s = await start(
      await addTrack('HSK4', { kinds: ['readingGroup'], dailySize: 2 }),
    );
    const done = await finish(s);
    expect(done.progress).toEqual({ answered: 2, total: 2 });
    expect(done.result.total).toBeGreaterThan(2);
    expect(done.result.correct).toBe(done.result.total);
  });

  it('DP-10, DP-40, DP-32: "Save as card" on a wrong single question creates one Card tagged with the track', async () => {
    const s = await start(
      await addTrack('HSK4', { kinds: ['single'], dailySize: 2 }),
    );
    const done = await finish(s, [s.quizzes[0].id]);
    const wrong = done.quizzes[0].answer!.questions[0];
    const right = done.quizzes[1].answer!.questions[0];
    expect(wrong.canSaveAsCard).toBe(true);
    expect(right.canSaveAsCard).toBe(false);

    const res = await http()
      .post(
        `/practice/sessions/${s.id}/questions/${wrong.questionId}/save-as-card`,
      )
      .expect(201);
    const card = (await http().get(`/cards/${res.body.cardId}`).expect(200))
      .body as {
      front: string;
      back: string;
      tags: { name: string }[];
    };
    const quiz = done.quizzes[0];
    expect(card.front).toBe(
      `${quiz.questions[0].text}  ${quiz.questions[0].choices.map((c, i) => `${'ABCDEF'[i]} ${c}`).join('  ')}`,
    );
    expect(
      card.back.startsWith(quiz.questions[0].choices[keyOf(done, quiz.id)[0]]),
    ).toBe(true);
    expect(card.tags.map((t) => t.name)).toEqual(['HSK4']);

    const after = (await http().get(`/practice/sessions/${s.id}`).expect(200))
      .body as DailySessionView;
    expect(after.quizzes[0].answer!.questions[0]).toMatchObject({
      savedAsCard: true,
      canSaveAsCard: false,
    });
    const twice = await http()
      .post(
        `/practice/sessions/${s.id}/questions/${wrong.questionId}/save-as-card`,
      )
      .expect(409);
    expect(twice.body).toMatchObject({
      error: 'CannotSaveAsCard',
      reason: 'alreadySaved',
    });
    const notWrong = await http()
      .post(
        `/practice/sessions/${s.id}/questions/${right.questionId}/save-as-card`,
      )
      .expect(409);
    expect(notWrong.body.reason).toBe('notWrong');
  });

  it('DP-40: no "Save as card" on reading-group questions', async () => {
    const s = await start(
      await addTrack('HSK4', { kinds: ['readingGroup'], dailySize: 1 }),
    );
    const done = await finish(s, [s.quizzes[0].id]);
    expect(
      done.quizzes[0].answer!.questions.every((q) => !q.canSaveAsCard),
    ).toBe(true);
  });

  it('G-2: tracks are added from question tags with quiz counts; unknown tags are refused', async () => {
    await addTrack('HSK4');
    const options = (await http().get('/practice/track-options').expect(200))
      .body;
    expect(options).toEqual([
      { name: 'HSK4', quizCount: 41, tracked: true },
      { name: 'sample', quizCount: 41, tracked: false },
    ]);
    const res = await http()
      .post('/practice/tracks')
      .send({ tagName: 'TOEIC' })
      .expect(404);
    expect(res.body.error).toBe('QuestionTagNotFound');
  });

  it('G-10: adding a tag that is already a track returns the same track', async () => {
    expect(await addTrack('HSK4')).toBe(await addTrack('HSK4'));
  });
});
