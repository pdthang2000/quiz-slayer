import type { QuestionId, QuizId } from './ids';

/** Base for every Daily Practice rule violation. The api/ layer maps these to HTTP. */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** DP-05: the phone sent no timezone, or one that does not exist. */
export class InvalidTimeZone extends DomainError {
  readonly code = 'InvalidTimeZone';
  constructor(readonly input: string | undefined) {
    super(`"${input ?? ''}" is not a timezone`);
  }
}

/** DP-12: daily size outside 1–50. */
export class InvalidDailySize extends DomainError {
  readonly code = 'InvalidDailySize';
  constructor(readonly input: number) {
    super(`Daily size ${input} is not between 1 and 50`);
  }
}

/** DP-12: a track needs at least one kind (provisional, G-8). Also: an unknown kind. */
export class InvalidTrackKinds extends DomainError {
  readonly code = 'InvalidTrackKinds';
  constructor(readonly reason: 'empty' | 'unknown') {
    super(`Track kinds are invalid: ${reason}`);
  }
}

/** DP-15: a removed track has no daily set until it is added again. */
export class TrackIsRemoved extends DomainError {
  readonly code = 'TrackIsRemoved';
  constructor() {
    super('This track was removed');
  }
}

/** DP-14: nothing matches the track's settings, so there is no set to start (provisional, G-9). */
export class NoQuizzesMatch extends DomainError {
  readonly code = 'NoQuizzesMatch';
  constructor() {
    super('No quizzes match the track settings');
  }
}

/** DP-03: a quiz is answered once. */
export class QuizAlreadyAnswered extends DomainError {
  readonly code = 'QuizAlreadyAnswered';
  constructor(readonly quizId: QuizId) {
    super(`Quiz ${quizId} is already answered`);
  }
}

/** DP-21: quizzes are answered in order. */
export class QuizOutOfOrder extends DomainError {
  readonly code = 'QuizOutOfOrder';
  constructor(readonly quizId: QuizId) {
    super(`Quiz ${quizId} is not the next one`);
  }
}

/** A bug in the app: the quiz is not in this session, or the answers don't fit its questions. */
export class InvalidAnswer extends DomainError {
  readonly code = 'InvalidAnswer';
  constructor(readonly reason: 'unknownQuiz' | 'wrongCount' | 'unknownChoice') {
    super(`Answer is invalid: ${reason}`);
  }
}

/** DP-10, DP-32, DP-40: "Save as card" is not offered for this question. */
export class CannotSaveAsCard extends DomainError {
  readonly code = 'CannotSaveAsCard';
  constructor(
    readonly questionId: QuestionId,
    readonly reason:
      'notAnswered' | 'notWrong' | 'notEligible' | 'alreadySaved',
  ) {
    super(`Question ${questionId} can't be saved as a card: ${reason}`);
  }
}

/** DP-52: a set can be finished until the end of the next day; after that it is view only. */
export class DailySessionClosed extends DomainError {
  readonly code = 'DailySessionClosed';
  constructor() {
    super('This day is over');
  }
}

/** DP-53, CONFLICT-01: the track changed since the screen showed it. */
export class TrackChanged extends DomainError {
  readonly code = 'TrackChanged';
  constructor() {
    super('This track changed');
  }
}

/** DP-01: the track already has a session that day (two Start taps at once). */
export class DailySessionExists extends DomainError {
  readonly code = 'DailySessionExists';
  constructor() {
    super('This track already has a daily session today');
  }
}

/** Two devices changed the same session or track at once; the later one must reload. */
export class PracticeChanged extends DomainError {
  readonly code = 'PracticeChanged';
  constructor(readonly what: 'track' | 'session' | 'progress') {
    super(`The ${what} was changed meanwhile`);
  }
}
