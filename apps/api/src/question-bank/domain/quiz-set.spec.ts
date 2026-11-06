import { InvalidQuestionTagName, InvalidQuiz } from './errors';
import { QuestionId, QuizId, QuizSetId } from './ids';
import { QuestionTagName } from './question-tag-name';
import { checkQuiz, type Question, QuizSet, type QuizInput } from './quiz-set';

const question = (id: string, over: Partial<Question> = {}): Question => ({
  id: QuestionId(`${id}-uuid`),
  externalId: id,
  text: `question ${id}`,
  choices: ['A', 'B', 'C', 'D'],
  correctChoice: 0,
  ...over,
});

const single = (id: string, over: Partial<QuizInput> = {}): QuizInput => ({
  id: QuizId(`${id}-uuid`),
  externalId: id,
  kind: 'single',
  questions: [question(`${id}-q`)],
  tags: ['HSK4'],
  ...over,
});

const group = (
  id: string,
  n: number,
  over: Partial<QuizInput> = {},
): QuizInput => ({
  id: QuizId(`${id}-uuid`),
  externalId: id,
  kind: 'readingGroup',
  passage: 'passage',
  questions: Array.from({ length: n }, (_, i) => question(`${id}-q${i}`)),
  tags: ['HSK4'],
  ...over,
});

describe('Quiz Set', () => {
  it('QB-01: visibility is set on the Quiz Set, not on its questions', () => {
    const set = QuizSet.create({
      id: QuizSetId('s'),
      ownerUserId: null,
      name: 'n',
      quizzes: [single('a')],
    });
    expect(set.toSnapshot()).toHaveProperty('visibility');
    expect(set.quizzes[0]).not.toHaveProperty('visibility');
    expect(set.quizzes[0].questions[0]).not.toHaveProperty('visibility');
  });

  it('QB-02: a new Quiz Set is Private', () => {
    const set = QuizSet.create({
      id: QuizSetId('s'),
      ownerUserId: null,
      name: 'HSK4 Sample',
      quizzes: [],
    });
    expect(set.visibility).toBe('Private');
  });

  it('QB-06: kinds single, single audio, reading group (passage + 2–4), audio group (audio + 2–4)', () => {
    expect(checkQuiz(single('a')).kind).toBe('single');
    expect(
      checkQuiz(
        single('b', { kind: 'singleAudio', audioUrl: 'https://x/b.mp3' }),
      ).kind,
    ).toBe('singleAudio');
    expect(checkQuiz(group('g', 2)).questions).toHaveLength(2);
    expect(
      checkQuiz(
        group('h', 4, {
          kind: 'audioGroup',
          passage: undefined,
          audioUrl: 'https://x/h.mp3',
        }),
      ).kind,
    ).toBe('audioGroup');
    expect(() => checkQuiz(group('g1', 1))).toThrow(InvalidQuiz);
    expect(() => checkQuiz(group('g5', 5))).toThrow(InvalidQuiz);
    expect(() => checkQuiz(group('np', 3, { passage: '' }))).toThrow(
      InvalidQuiz,
    );
    expect(() =>
      checkQuiz(single('two', { questions: [question('x'), question('y')] })),
    ).toThrow(InvalidQuiz);
    expect(() => checkQuiz(single('k', { kind: 'listening' }))).toThrow(
      InvalidQuiz,
    );
    expect(() => checkQuiz(single('na', { kind: 'singleAudio' }))).toThrow(
      InvalidQuiz,
    );
  });

  it('DP-07: multiple choice: 2–6 choices, one correct', () => {
    expect(() =>
      checkQuiz(
        single('c1', { questions: [question('q', { choices: ['only'] })] }),
      ),
    ).toThrow(InvalidQuiz);
    expect(() =>
      checkQuiz(
        single('c7', {
          questions: [
            question('q', { choices: ['1', '2', '3', '4', '5', '6', '7'] }),
          ],
        }),
      ),
    ).toThrow(InvalidQuiz);
    expect(() =>
      checkQuiz(
        single('k', { questions: [question('q', { correctChoice: 4 })] }),
      ),
    ).toThrow(InvalidQuiz);
    expect(
      checkQuiz(
        single('ok', {
          questions: [question('q', { choices: ['x', 'y'], correctChoice: 1 })],
        }),
      ),
    ).toBeTruthy();
  });

  it('QB-07: question tags follow the Card tag name rules (TAG-01), normalized and deduplicated', () => {
    expect(
      checkQuiz(single('t', { tags: [' HSK4 ', 'HSK4', 'mock'] })).tags,
    ).toEqual(['HSK4', 'mock']);
    expect(QuestionTagName.create('  pit   bull ').value).toBe('pit bull');
    expect(() => QuestionTagName.create('#HSK4')).toThrow(
      InvalidQuestionTagName,
    );
    expect(() => QuestionTagName.create('x'.repeat(51))).toThrow(
      InvalidQuestionTagName,
    );
  });

  it("QB-08: a group's tags are on the group, not on its questions", () => {
    const quiz = checkQuiz(group('g', 3, { tags: ['HSK4', 'reading'] }));
    expect(quiz.tags).toEqual(['HSK4', 'reading']);
    expect(quiz.questions.every((q) => !('tags' in q))).toBe(true);
  });

  it('QB-09: a tag never repeats the kind: no #listening or #audio', () => {
    expect(() => QuestionTagName.create('listening')).toThrow(
      InvalidQuestionTagName,
    );
    expect(() => QuestionTagName.create('Audio')).toThrow(
      InvalidQuestionTagName,
    );
    expect(() => checkQuiz(single('x', { tags: ['reading group'] }))).toThrow(
      InvalidQuestionTagName,
    );
  });

  it('QB-12: listening, audio and the kind names are refused, ignoring case', () => {
    for (const name of [
      'LISTENING',
      'audio',
      'Single',
      'single audio',
      'Reading Group',
      'audio group',
    ]) {
      expect(() => QuestionTagName.create(name)).toThrow(
        InvalidQuestionTagName,
      );
    }
    expect(QuestionTagName.create('reading').value).toBe('reading');
  });

  it('QB-11: exam, level, part and topic are plain tags, not fields', () => {
    const quiz = checkQuiz(single('t', { tags: ['HSK4', 'part3', 'grammar'] }));
    expect(quiz.tags).toEqual(['HSK4', 'part3', 'grammar']);
    expect(Object.keys(quiz).sort()).toEqual([
      'externalId',
      'id',
      'kind',
      'questions',
      'tags',
    ]);
  });

  it('re-import keeps the ids of quizzes and questions with the same external id (DP-38)', () => {
    const set = QuizSet.create({
      id: QuizSetId('s'),
      ownerUserId: null,
      name: 'n',
      quizzes: [single('a')],
    });
    set.replaceQuizzes([
      single('a', {
        id: QuizId('new-uuid'),
        questions: [
          question('a-q', { id: QuestionId('new-q'), text: 'fixed' }),
        ],
      }),
      single('b'),
    ]);
    expect(set.quizzes.map((q) => q.id)).toEqual(['a-uuid', 'b-uuid']);
    expect(set.quizzes[0].questions[0]).toMatchObject({
      id: 'a-q-uuid',
      text: 'fixed',
    });
  });

  it('a file with the same quiz id twice is refused', () => {
    expect(() =>
      QuizSet.create({
        id: QuizSetId('s'),
        ownerUserId: null,
        name: 'n',
        quizzes: [single('a'), single('a')],
      }),
    ).toThrow(InvalidQuiz);
  });
});

describe('Questions leaving the bank', () => {
  it('DP-51: a question dropped by a re-import raises QuestionsDeleted; a fixed one keeps its id', () => {
    const set = QuizSet.create({
      id: QuizSetId('set'),
      ownerUserId: null,
      name: 'S',
      quizzes: [single('a'), single('b')],
    });
    const before = set.quizzes.map((q) => q.questions[0].id);

    set.replaceQuizzes([single('a', { tags: ['HSK4', 'fixed'] })]);

    expect(set.quizzes[0].questions[0].id).toBe(before[0]);
    expect(set.pullEvents()).toEqual([
      { type: 'QuestionsDeleted', questionIds: [before[1]] },
    ]);
    expect(set.pullEvents()).toEqual([]);
  });
});
