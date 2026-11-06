import { DailySession } from './daily-session';
import {
  CannotSaveAsCard,
  CannotWriteNote,
  DailySessionClosed,
  InvalidAnswer,
  InvalidTimeZone,
  NoQuizzesMatch,
  QuizAlreadyAnswered,
  QuizOutOfOrder,
} from './errors';
import { QuestionId, QuizId } from './ids';
import { LocalDate } from './local-date';
import { cardFits } from './quiz-snapshot';
import { question, readingGroup, single, startSession } from './test-data';

const AT = new Date('2026-11-07T02:00:00Z');
const q = QuizId;

describe('DailySession', () => {
  it('DP-05: belongs to the day it was started, even if finished after midnight', () => {
    const session = startSession([single('a')], {
      day: LocalDate.parse('2026-11-07'), // started 23:55 Saturday
    });
    session.answerQuiz(q('a'), [0], new Date('2026-11-07T17:05:00Z')); // 00:05 Sunday in Hanoi
    expect(session.isFinished).toBe(true);
    expect(session.day.value).toBe('2026-11-07');
    expect(session.pullEvents().at(-1)).toMatchObject({
      type: 'DailySessionFinished',
      day: '2026-11-07',
    });
  });

  it('DP-17: a group is one quiz; a set of 10 quizzes can hold 15 questions', () => {
    const quizzes = [
      single('q1'),
      single('q2'),
      readingGroup('g1', 3),
      single('q3'),
      readingGroup('g2', 4),
      ...['q4', 'q5', 'q6', 'q7', 'q8'].map((id) => single(id)),
    ];
    const session = startSession(quizzes);
    expect(session.progress).toEqual({ answered: 0, total: 10 });
    expect(session.result.total).toBe(15);
  });

  it('DP-18: progress counts quizzes, the result counts questions', () => {
    const session = startSession([
      single('a'),
      readingGroup('g', 3),
      single('b'),
    ]);
    session.answerQuiz(q('a'), [0], AT); // right
    session.answerQuiz(q('g'), [0, 1, 0], AT); // 2 of 3 right
    expect(session.progress).toEqual({ answered: 2, total: 3 });
    expect(session.result).toEqual({ correct: 3, total: 5 });
  });

  it('DP-20: right or wrong is shown right after each quiz, with the correct answer and explanation', () => {
    const session = startSession([
      single('a', { correctChoice: 2, explanation: '是 = to be' }),
    ]);
    const feedback = session.answerQuiz(q('a'), [1], AT);
    expect(feedback.questions).toEqual([
      {
        questionId: 'a-q',
        chosen: 1,
        correctChoice: 2,
        correct: false,
        explanation: '是 = to be',
      },
    ]);
  });

  it('DP-21: quizzes are answered in order; no skipping', () => {
    const session = startSession([single('a'), single('b')]);
    expect(() => session.answerQuiz(q('b'), [0], AT)).toThrow(QuizOutOfOrder);
    session.answerQuiz(q('a'), [0], AT);
    expect(() => session.answerQuiz(q('b'), [0], AT)).not.toThrow();
  });

  it("DP-03: a quiz is answered once; the answer can't change", () => {
    const session = startSession([single('a'), single('b')]);
    session.answerQuiz(q('a'), [1], AT);
    expect(() => session.answerQuiz(q('a'), [0], AT)).toThrow(
      QuizAlreadyAnswered,
    );
    expect(session.answerOf(q('a'))!.choices).toEqual([1]);
  });

  it('DP-03: a group is answered as a whole, one choice per question', () => {
    const session = startSession([readingGroup('g', 3)]);
    expect(() => session.answerQuiz(q('g'), [0, 1], AT)).toThrow(InvalidAnswer);
    expect(() => session.answerQuiz(q('g'), [0, 1, 9], AT)).toThrow(
      InvalidAnswer,
    );
    expect(() => session.answerQuiz(q('x'), [0], AT)).toThrow(InvalidAnswer);
    expect(session.progress.answered).toBe(0);
  });

  it('DP-22: leaving keeps the progress; the next quiz is where the user stopped', () => {
    const session = startSession([single('a'), single('b'), single('c')]);
    session.answerQuiz(q('a'), [0], AT);
    const reloaded = DailySession.reconstitute(session.toSnapshot()); // eslint-disable-line no-restricted-syntax
    expect(reloaded.nextQuiz!.id).toBe('b');
    expect(reloaded.progress).toEqual({ answered: 1, total: 3 });
  });

  it('DP-23: finished when every quiz is answered, whatever the score', () => {
    const session = startSession([single('a'), single('b')]);
    session.answerQuiz(q('a'), [3], AT);
    expect(session.isFinished).toBe(false);
    const feedback = session.answerQuiz(q('b'), [3], AT); // all wrong
    expect(feedback.sessionFinished).toBe(true);
    expect(session.isFinished).toBe(true);
    expect(session.nextQuiz).toBeNull();
    expect(session.pullEvents().map((e) => e.type)).toEqual([
      'DailySessionStarted',
      'QuizAnswered',
      'QuizAnswered',
      'DailySessionFinished',
    ]);
  });

  it('DP-29: a group with one wrong question is answered wrong as a whole', () => {
    const session = startSession([readingGroup('g', 3)]);
    session.pullEvents();
    session.answerQuiz(q('g'), [0, 0, 1], AT);
    expect(session.pullEvents()[0]).toEqual({
      type: 'QuizAnswered',
      sessionId: 's1',
      userId: 'u1',
      quizId: 'g',
      day: '2026-11-07',
      answeredAt: AT.toISOString(),
      correct: false,
    });
  });

  it('DP-14: a set with fewer quizzes than the daily size is short', () => {
    expect(startSession([single('a')], { dailySize: 10 }).isShort).toBe(true);
    expect(startSession([single('a')], { dailySize: 1 }).isShort).toBe(false);
  });

  it('DP-14: nothing matching at all starts no set (provisional G-9)', () => {
    expect(() => startSession([])).toThrow(NoQuizzesMatch);
  });

  it('QB-04: the session keeps its snapshot of the quizzes it served', () => {
    const quiz = single('a', { correctChoice: 1 });
    const session = startSession([quiz]);
    const snapshot = session.toSnapshot();
    expect(snapshot.quizzes[0]).toEqual(quiz);
  });
});

describe('Save as card', () => {
  const wrongSingle = () => {
    const session = startSession([
      single('a', {
        text: '我___学生。',
        choices: ['是', '在', '有', '去'],
        correctChoice: 0,
        explanation: '是 = to be',
      }),
    ]);
    session.answerQuiz(q('a'), [1], AT);
    return session;
  };

  it('DP-10: only a wrong answer offers "Save as card"', () => {
    const right = startSession([single('a')]);
    expect(right.canSaveAsCard(QuestionId('a-q'))).toBe(false); // not answered yet
    right.answerQuiz(q('a'), [0], AT);
    expect(right.canSaveAsCard(QuestionId('a-q'))).toBe(false);
    expect(() => right.cardDraftFor(QuestionId('a-q'))).toThrow(
      CannotSaveAsCard,
    );
    expect(wrongSingle().canSaveAsCard(QuestionId('a-q'))).toBe(true);
  });

  it("DP-40: front = question + choices, back = answer + explanation, tag = the track's tag", () => {
    expect(wrongSingle().cardDraftFor(QuestionId('a-q'))).toEqual({
      front: '我___学生。  A 是  B 在  C 有  D 去',
      back: '是 — 是 = to be',
      tagName: 'HSK4',
    });
    const noExplanation = startSession([
      single('b', { choices: ['x', 'y'], correctChoice: 1 }),
    ]);
    noExplanation.answerQuiz(q('b'), [0], AT);
    expect(noExplanation.cardDraftFor(QuestionId('b-q')).back).toBe('y');
  });

  it('DP-40: not offered on group questions or images', () => {
    const group = startSession([readingGroup('g', 2)]);
    group.answerQuiz(q('g'), [1, 1], AT);
    expect(group.canSaveAsCard(QuestionId('g-q1'))).toBe(false);

    const image = startSession([single('i', { imageUrl: 'https://x/i.png' })]);
    image.answerQuiz(q('i'), [1], AT);
    expect(image.canSaveAsCard(QuestionId('i-q'))).toBe(false);
  });

  it('DP-16: not offered for audio kinds', () => {
    const session = startSession([
      {
        id: q('au'),
        kind: 'singleAudio',
        audioUrl: 'https://x/a.mp3',
        questions: [question('au-q')],
      },
    ]);
    session.answerQuiz(q('au'), [1], AT);
    expect(session.canSaveAsCard(QuestionId('au-q'))).toBe(false);
  });

  it("DP-32: after saving, the question can't create a second card in this session", () => {
    const session = wrongSingle();
    session.markSavedAsCard(QuestionId('a-q'));
    expect(session.isSavedAsCard(QuestionId('a-q'))).toBe(true);
    expect(session.canSaveAsCard(QuestionId('a-q'))).toBe(false);
    expect(() => session.cardDraftFor(QuestionId('a-q'))).toThrow(
      new CannotSaveAsCard(QuestionId('a-q'), 'alreadySaved'),
    );
  });
});

describe('DP-52: finishing a set late', () => {
  const TZ = 'Asia/Ho_Chi_Minh';

  it('DP-52: a set can be answered until the end of the next day; it counts for its own day', () => {
    const session = startSession([single('a'), single('b')]);
    session.answerQuiz(q('a'), [0], AT);
    session.answerQuiz(q('b'), [0], new Date('2026-11-08T16:59:00Z'), TZ); // 23:59 Sunday
    expect(session.isFinished).toBe(true);
    expect(session.day.value).toBe('2026-11-07');
  });

  it('DP-52: after the end of the next day → DailySessionClosed, nothing changes', () => {
    const session = startSession([single('a')]);
    const monday = new Date('2026-11-08T17:00:00Z'); // 00:00 Monday in Hanoi
    expect(() => session.answerQuiz(q('a'), [0], monday, TZ)).toThrow(
      DailySessionClosed,
    );
    expect(session.progress.answered).toBe(0);
    expect(session.isClosedAt(monday, TZ)).toBe(true);
    expect(session.isClosedAt(new Date('2026-11-08T16:59:00Z'), TZ)).toBe(
      false,
    );
  });

  it("DP-52: an app too old to send its timezone gets the session's", () => {
    const session = startSession([single('a')]);
    expect(session.isClosedAt(new Date('2026-11-08T17:00:00Z'))).toBe(true);
  });

  it('DP-05: an unknown timezone is refused', () => {
    const session = startSession([single('a')]);
    expect(() => session.isClosedAt(AT, 'Mars/Base')).toThrow(InvalidTimeZone);
  });

  it('DP-33: QuizAnswered carries the day of the answer, not the day of the session', () => {
    const session = startSession([single('a')]);
    session.answerQuiz(q('a'), [1], new Date('2026-11-08T05:00:00Z'), TZ);
    const [, answered] = session.pullEvents();
    expect(answered).toMatchObject({ type: 'QuizAnswered', day: '2026-11-08' });
  });
});

describe('Notes on a session', () => {
  it('DP-45: a note can be written only on a question answered in this session', () => {
    const session = startSession([single('a'), single('b')]);
    session.answerQuiz(q('a'), [1], AT);
    expect(() => session.assertCanWriteNote(QuestionId('a-q'))).not.toThrow();
    expect(() => session.assertCanWriteNote(QuestionId('b-q'))).toThrow(
      CannotWriteNote,
    );
    expect(() => session.assertCanWriteNote(QuestionId('nope'))).toThrow(
      CannotWriteNote,
    );
  });

  it('DP-41: right or wrong, an answered question can have a note', () => {
    const session = startSession([single('a')]);
    session.answerQuiz(q('a'), [0], AT); // right
    expect(session.answeredQuestionIds).toEqual(['a-q']);
  });

  it('DP-44: in a group each question has its own note', () => {
    const session = startSession([readingGroup('g', 3)]);
    session.answerQuiz(q('g'), [0, 0, 0], AT);
    expect(session.answeredQuestionIds).toEqual(['g-q1', 'g-q2', 'g-q3']);
  });

  it('DP-49: Save as card copies the note onto the back, below the explanation', () => {
    const session = startSession([single('a', { explanation: 'because' })]);
    session.answerQuiz(q('a'), [1], AT);
    const { back } = session.cardDraftFor(QuestionId('a-q'), 'my note');
    expect(back).toBe('A1 — because\n📝 my note');
  });
});

describe('DP-64: a card that does not fit', () => {
  it('DP-64: the button stays; the card fits or it does not, front and back', () => {
    const tooLong = single('a', { text: 'x'.repeat(600) });
    const session = startSession([tooLong]);
    session.answerQuiz(q('a'), [1], AT);
    expect(session.canSaveAsCard(QuestionId('a-q'))).toBe(true);
    expect(cardFits(session.cardDraftFor(QuestionId('a-q')))).toBe(false);
    expect(cardFits({ front: 'f', back: 'b'.repeat(3000), tagName: 't' })).toBe(
      true,
    );
    expect(cardFits({ front: 'f', back: 'b'.repeat(3001), tagName: 't' })).toBe(
      false,
    );
  });

  it('DP-64: the note can push the back over the limit', () => {
    const session = startSession([
      single('a', { explanation: 'e'.repeat(2990) }),
    ]);
    session.answerQuiz(q('a'), [1], AT);
    const id = QuestionId('a-q');
    expect(cardFits(session.cardDraftFor(id))).toBe(true);
    expect(cardFits(session.cardDraftFor(id, 'n'.repeat(50)))).toBe(false);
  });
});
