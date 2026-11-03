import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { connectTestDb, resetPracticeDb } from './db';
import { PrismaTransactionRunner } from '../../src/prisma/prisma-transaction-runner';
import {
  type ImportFile,
  ImportQuizSet,
} from '../../src/question-bank/application/import-quiz-set';
import { QuizId, UserId } from '../../src/question-bank/domain/ids';
import { PrismaQuestionBankQueries } from '../../src/question-bank/infrastructure/prisma-question-bank.queries';
import { PrismaQuizSetRepository } from '../../src/question-bank/infrastructure/prisma-quiz-set.repository';

const prisma = connectTestDb();
const repo = new PrismaQuizSetRepository(prisma);
const queries = new PrismaQuestionBankQueries(prisma);
const importQuizSet = new ImportQuizSet(
  repo,
  new PrismaTransactionRunner(prisma),
);

const SEED = join(__dirname, '../../prisma/seed/questions/hsk4-sample.json');
const seedFile = () => JSON.parse(readFileSync(SEED, 'utf8')) as ImportFile;
const me = UserId(randomUUID());
const someoneElse = UserId(randomUUID());

const file = (
  owner: ImportFile['owner'],
  quizSet: string,
  quizzes: ImportFile['quizzes'],
): ImportFile => ({
  quizSet,
  owner,
  quizzes,
});
const singleQuiz = (
  id: string,
  tags: string[],
  kind = 'single',
): ImportFile['quizzes'][number] => ({
  id,
  kind,
  tags,
  question: `question ${id}`,
  choices: ['a', 'b'],
  answer: 0,
  ...(kind === 'single audio' ? { audio: 'https://x/a.mp3' } : {}),
});

beforeEach(() => resetPracticeDb(prisma));
afterAll(() => prisma.onModuleDestroy());

describe('Question Bank persistence', () => {
  it('seed: loads hsk4-sample.json as System content: 41 quizzes (38 single, 3 reading groups), 50 questions', async () => {
    const result = await importQuizSet.execute(seedFile());
    expect(result.quizCount).toBe(41);
    expect(await prisma.db.question.count()).toBe(50);
    const set = await repo.findById(result.quizSetId);
    expect(set!.ownerUserId).toBeNull();
    expect(set!.quizzes.filter((q) => q.kind === 'readingGroup')).toHaveLength(
      3,
    );
  });

  it('seed: running it again keeps the quiz ids and adds nothing', async () => {
    await importQuizSet.execute(seedFile());
    const before = (
      await prisma.db.quiz.findMany({
        select: { id: true },
        orderBy: { id: 'asc' },
      })
    ).map((r) => r.id);
    await importQuizSet.execute(seedFile());
    const after = (
      await prisma.db.quiz.findMany({
        select: { id: true },
        orderBy: { id: 'asc' },
      })
    ).map((r) => r.id);
    expect(after).toEqual(before);
    expect(await prisma.db.question.count()).toBe(50);
  });

  it("QB-10: a pool is System quizzes plus the user's own, never another user's", async () => {
    await importQuizSet.execute(
      file('system', 'sys', [singleQuiz('s1', ['HSK4'])]),
    );
    await importQuizSet.execute(file(me, 'mine', [singleQuiz('m1', ['HSK4'])]));
    await importQuizSet.execute(
      file(someoneElse, 'theirs', [singleQuiz('o1', ['HSK4'])]),
    );
    const pool = await queries.poolQuizIds(me, 'HSK4', ['single']);
    const content = await queries.quizzesByIds(me, pool);
    expect(content.map((q) => q.questions[0].text).sort()).toEqual([
      'question m1',
      'question s1',
    ]);
  });

  it("DP-11, DP-12: the pool is one tag and the track's kinds", async () => {
    await importQuizSet.execute(
      file('system', 'sys', [
        singleQuiz('a', ['HSK4']),
        singleQuiz('b', ['HSK4'], 'single audio'),
        singleQuiz('c', ['HSK3']),
      ]),
    );
    expect(await queries.poolQuizIds(me, 'HSK4', ['single'])).toHaveLength(1);
    expect(
      await queries.poolQuizIds(me, 'HSK4', ['single', 'singleAudio']),
    ).toHaveLength(2);
    expect(await queries.poolQuizIds(me, 'hsk4', ['single'])).toHaveLength(0); // TAG-02: case-sensitive
  });

  it('QB-07: question tags with quiz counts, A–Z (G-2), separate from Card tags', async () => {
    await importQuizSet.execute(seedFile());
    await importQuizSet.execute(
      file(me, 'mine', [singleQuiz('m1', ['grammar', 'HSK4'])]),
    );
    expect(await queries.tagsWithCounts(me)).toEqual([
      { name: 'grammar', quizCount: 1 },
      { name: 'HSK4', quizCount: 42 },
      { name: 'sample', quizCount: 41 },
    ]);
  });

  it('QB-04: the content of a group comes with its passage and questions in order', async () => {
    await importQuizSet.execute(seedFile());
    const ids = await queries.poolQuizIds(me, 'HSK4', ['readingGroup']);
    const [group] = await queries.quizzesByIds(me, [ids[0]]);
    expect(group.passage).toBeTruthy();
    expect(group.questions.length).toBeGreaterThanOrEqual(2);
    expect(await queries.quizzesByIds(me, [QuizId(randomUUID())])).toEqual([]);
  });

  it('DP-07: the DB refuses a question with one choice (backstop)', async () => {
    await importQuizSet.execute(
      file('system', 'sys', [singleQuiz('a', ['HSK4'])]),
    );
    await expect(
      prisma.db.question.updateMany({ data: { choices: ['only'] } }),
    ).rejects.toThrow();
  });
});
