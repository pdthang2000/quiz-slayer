import { DomainError } from '../domain/errors';
import type { DailySessionId, TrackId } from '../domain/ids';

/** Application-layer errors (they need a lookup). Mapped to HTTP in api/. */

export class DailySessionNotFound extends DomainError {
  readonly code = 'DailySessionNotFound';
  constructor(readonly sessionId: DailySessionId) {
    super(`Daily session ${sessionId} not found`);
  }
}

export class TrackNotFound extends DomainError {
  readonly code = 'TrackNotFound';
  constructor(readonly trackId: TrackId | string) {
    super(`Track ${trackId} not found`);
  }
}

/** DP-11, G-2: a track can only follow a question tag that has quizzes. */
export class QuestionTagNotFound extends DomainError {
  readonly code = 'QuestionTagNotFound';
  constructor(readonly tagName: string) {
    super(`No quizzes are tagged "${tagName}"`);
  }
}
