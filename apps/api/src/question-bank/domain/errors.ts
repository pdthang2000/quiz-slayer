/** Base for every Question Bank rule violation. */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** QB-07 (TAG-01 rules), QB-09 (a tag never repeats the kind). */
export class InvalidQuestionTagName extends DomainError {
  readonly code = 'InvalidQuestionTagName';
  constructor(
    readonly input: string,
    readonly reason: 'length' | 'character' | 'repeatsKind',
  ) {
    super(`Question tag "${input}" is invalid: ${reason}`);
  }
}

/** QB-06, DP-07: the quiz does not fit its kind, or a question is not a valid multiple choice. */
export class InvalidQuiz extends DomainError {
  readonly code = 'InvalidQuiz';
  constructor(
    readonly externalId: string,
    readonly reason: string,
  ) {
    super(`Quiz "${externalId}" is invalid: ${reason}`);
  }
}
