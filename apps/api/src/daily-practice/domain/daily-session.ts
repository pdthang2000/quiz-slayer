import { AggregateRoot } from './aggregate-root';
import {
  CannotSaveAsCard,
  CannotWriteNote,
  DailySessionClosed,
  InvalidAnswer,
  NoQuizzesMatch,
  QuizAlreadyAnswered,
  QuizOutOfOrder,
} from './errors';
import type { DailySessionEvent } from './events';
import type {
  DailySessionId,
  QuestionId,
  QuizId,
  TrackId,
  UserId,
} from './ids';
import { checkTimeZone, LocalDate } from './local-date';
import {
  canBeSavedAsCard,
  cardDraftFor,
  type CardDraft,
  type QuizSnapshot,
} from './quiz-snapshot';

/** DP-03: what the user chose for each question of a quiz; can't change. */
export type QuizAnswer = {
  readonly quizId: QuizId;
  /** One choice index per question, in question order. */
  readonly choices: readonly number[];
  readonly answeredAt: Date;
};

/** DP-20: shown right after a quiz is answered. */
export type QuizFeedback = {
  quizId: QuizId;
  questions: {
    questionId: QuestionId;
    chosen: number;
    correctChoice: number;
    correct: boolean;
    explanation?: string;
  }[];
  /** DP-23 */
  sessionFinished: boolean;
};

export type DailySessionSnapshot = {
  id: DailySessionId;
  userId: UserId;
  trackId: TrackId;
  /** DP-10, DP-40: the card's tag. */
  tagName: string;
  /** DP-05: the day it was started in the phone's timezone. */
  day: LocalDate;
  timeZone: string;
  startedAt: Date;
  /** DP-14: the daily size asked for; fewer quizzes means "Only N quizzes match". */
  dailySize: number;
  quizzes: QuizSnapshot[];
  answers: QuizAnswer[];
  /** DP-32 */
  savedAsCard: QuestionId[];
  finishedAt: Date | null;
  version: number;
};

/**
 * One track's set of quizzes for one day (DP-01, DP-17). Holds a snapshot of the quizzes
 * (QB-04); answers are given quiz by quiz, in order (DP-21), once (DP-03).
 */
export class DailySession extends AggregateRoot<DailySessionEvent> {
  private constructor(private readonly s: DailySessionSnapshot) {
    super();
  }

  /** DP-31: the set is chosen when Start is tapped; the use case builds it (buildDailySet). */
  static start(input: {
    id: DailySessionId;
    userId: UserId;
    trackId: TrackId;
    tagName: string;
    day: LocalDate;
    timeZone: string;
    startedAt: Date;
    dailySize: number;
    quizzes: QuizSnapshot[];
  }): DailySession {
    if (input.quizzes.length === 0) throw new NoQuizzesMatch();
    const session = new DailySession({
      ...input,
      quizzes: [...input.quizzes],
      answers: [],
      savedAsCard: [],
      finishedAt: null,
      version: 0,
    });
    session.record({
      type: 'DailySessionStarted',
      sessionId: input.id,
      userId: input.userId,
      trackId: input.trackId,
      day: input.day.value,
      quizCount: input.quizzes.length,
    });
    return session;
  }

  /** Rebuilds a stored session. Only infrastructure mappers call this. */
  static reconstitute(s: DailySessionSnapshot): DailySession {
    return new DailySession({ ...s });
  }

  get id() {
    return this.s.id;
  }
  get userId() {
    return this.s.userId;
  }
  get trackId() {
    return this.s.trackId;
  }
  get day() {
    return this.s.day;
  }
  get version() {
    return this.s.version;
  }
  get quizzes(): readonly QuizSnapshot[] {
    return this.s.quizzes;
  }
  get answers(): readonly QuizAnswer[] {
    return this.s.answers;
  }

  /** DP-23: finished when every quiz is answered, whatever the score. */
  get isFinished(): boolean {
    return this.s.finishedAt !== null;
  }

  /** DP-18: progress counts quizzes ("4 / 10"). */
  get progress() {
    return { answered: this.s.answers.length, total: this.s.quizzes.length };
  }

  /** DP-18: the result counts questions ("23 / 28 correct"). */
  get result() {
    let correct = 0;
    let total = 0;
    for (const quiz of this.s.quizzes) total += quiz.questions.length;
    for (const answer of this.s.answers) {
      const quiz = this.quiz(answer.quizId)!;
      quiz.questions.forEach((q, i) => {
        if (answer.choices[i] === q.correctChoice) correct++;
      });
    }
    return { correct, total };
  }

  /** DP-14: the set has fewer quizzes than the daily size. */
  get isShort(): boolean {
    return this.s.quizzes.length < this.s.dailySize;
  }

  /** DP-21, DP-22: the next quiz to answer; null when finished. */
  get nextQuiz(): QuizSnapshot | null {
    return this.s.quizzes[this.s.answers.length] ?? null;
  }

  /**
   * DP-05: the phone's calendar day at an instant. An app too old to send its timezone
   * gets the zone this session was started in (ADR-013).
   */
  private dayAt(at: Date, timeZone: string | undefined): LocalDate {
    return LocalDate.of(
      at,
      timeZone === undefined ? this.s.timeZone : checkTimeZone(timeZone),
    );
  }

  /** DP-52: after the end of the next day no more answers; the set stays viewable. */
  isClosedAt(at: Date, timeZone?: string): boolean {
    return this.dayAt(at, timeZone).isAfter(this.s.day.addDays(1));
  }

  /**
   * DP-03, DP-21, DP-29: answers a whole quiz (a single question, or every question of a
   * group) at once. Raises QuizAnswered, and DailySessionFinished with the last one (DP-23).
   * DP-52: closed after the end of the next day. DP-33: `day` of QuizAnswered is the day of
   * the answer, which is not the session's day when a set is finished the next day.
   */
  answerQuiz(
    quizId: QuizId,
    choices: readonly number[],
    at: Date,
    timeZone?: string,
  ): QuizFeedback {
    const quiz = this.quiz(quizId);
    if (!quiz) throw new InvalidAnswer('unknownQuiz');
    if (this.answerOf(quizId)) throw new QuizAlreadyAnswered(quizId);
    const answeredOn = this.dayAt(at, timeZone);
    if (answeredOn.isAfter(this.s.day.addDays(1)))
      throw new DailySessionClosed();
    if (this.nextQuiz?.id !== quizId) throw new QuizOutOfOrder(quizId);
    if (choices.length !== quiz.questions.length)
      throw new InvalidAnswer('wrongCount');
    quiz.questions.forEach((q, i) => {
      const c = choices[i];
      if (!Number.isInteger(c) || c < 0 || c >= q.choices.length) {
        throw new InvalidAnswer('unknownChoice');
      }
    });

    this.s.answers = [
      ...this.s.answers,
      { quizId, choices: [...choices], answeredAt: at },
    ];
    const feedback = this.feedbackFor(quiz, choices);
    this.record({
      type: 'QuizAnswered',
      sessionId: this.s.id,
      userId: this.s.userId,
      quizId,
      day: answeredOn.value,
      answeredAt: at.toISOString(),
      correct: feedback.questions.every((q) => q.correct),
    });
    if (this.s.answers.length === this.s.quizzes.length) {
      this.s.finishedAt = at;
      this.record({
        type: 'DailySessionFinished',
        sessionId: this.s.id,
        userId: this.s.userId,
        trackId: this.s.trackId,
        day: this.s.day.value,
      });
    }
    return { ...feedback, sessionFinished: this.isFinished };
  }

  /** DP-10, DP-16, DP-32, DP-40: whether "Save as card" is shown for this question. */
  canSaveAsCard(questionId: QuestionId): boolean {
    return this.saveAsCardProblem(questionId) === null;
  }

  /** DP-32: after a "Save as card" tap the button shows "Saved ✓". */
  isSavedAsCard(questionId: QuestionId): boolean {
    return this.s.savedAsCard.includes(questionId);
  }

  /** DP-10, DP-40, DP-49: the card to create. Checks the button may be shown. */
  cardDraftFor(questionId: QuestionId, note: string | null = null): CardDraft {
    const problem = this.saveAsCardProblem(questionId);
    if (problem) throw new CannotSaveAsCard(questionId, problem);
    const quiz = this.quizOfQuestion(questionId)!;
    return cardDraftFor(quiz.questions[0], this.s.tagName, note);
  }

  /** DP-32: the card was created; the question can't create a second one in this session. */
  markSavedAsCard(questionId: QuestionId): void {
    const problem = this.saveAsCardProblem(questionId);
    if (problem) throw new CannotSaveAsCard(questionId, problem);
    this.s.savedAsCard = [...this.s.savedAsCard, questionId];
  }

  /** DP-45: the questions whose notes this session may show. */
  get answeredQuestionIds(): QuestionId[] {
    return this.s.answers.flatMap((a) =>
      this.quiz(a.quizId)!.questions.map((q) => q.id),
    );
  }

  /** DP-45: a note is written only on a question answered in this session. */
  assertCanWriteNote(questionId: QuestionId): void {
    if (!this.answeredQuestionIds.includes(questionId))
      throw new CannotWriteNote(questionId);
  }

  toSnapshot(): DailySessionSnapshot {
    return {
      ...this.s,
      quizzes: [...this.s.quizzes],
      answers: [...this.s.answers],
      savedAsCard: [...this.s.savedAsCard],
    };
  }

  private saveAsCardProblem(
    questionId: QuestionId,
  ): 'notAnswered' | 'notWrong' | 'notEligible' | 'alreadySaved' | null {
    const quiz = this.quizOfQuestion(questionId);
    if (!quiz) return 'notEligible';
    if (!canBeSavedAsCard(quiz)) return 'notEligible';
    const answer = this.answerOf(quiz.id);
    if (!answer) return 'notAnswered';
    if (answer.choices[0] === quiz.questions[0].correctChoice)
      return 'notWrong';
    if (this.isSavedAsCard(questionId)) return 'alreadySaved';
    return null;
  }

  private quiz(quizId: QuizId) {
    return this.s.quizzes.find((q) => q.id === quizId);
  }

  private quizOfQuestion(questionId: QuestionId) {
    return this.s.quizzes.find((q) =>
      q.questions.some((x) => x.id === questionId),
    );
  }

  answerOf(quizId: QuizId): QuizAnswer | undefined {
    return this.s.answers.find((a) => a.quizId === quizId);
  }

  feedbackFor(
    quiz: QuizSnapshot,
    choices: readonly number[],
  ): Omit<QuizFeedback, 'sessionFinished'> {
    return {
      quizId: quiz.id,
      questions: quiz.questions.map((q, i) => ({
        questionId: q.id,
        chosen: choices[i],
        correctChoice: q.correctChoice,
        correct: choices[i] === q.correctChoice,
        explanation: q.explanation,
      })),
    };
  }
}
