import type { QuizAnswered } from './events';
import type { DailySessionId, QuizId, UserId } from './ids';
import { LocalDate } from './local-date';

/** DP-33: how many days until a mistake comes back. */
export type MistakeStage = 1 | 3 | 7;

/** DP-08, DP-33: a quiz answered wrong, waiting for its comeback day. */
export type Mistake = { stage: MistakeStage; dueOn: LocalDate };

export type QuizProgressSnapshot = {
  userId: UserId;
  quizId: QuizId;
  lastAnsweredOn: LocalDate;
  lastAnsweredAt: Date;
  /** Idempotency (6c): the session whose answer was applied last. */
  lastSessionId: DailySessionId;
  mistake: Mistake | null;
  version: number;
};

/** DP-33: right on a comeback moves to the next stage; right at 7 days retires the mistake. */
const NEXT_STAGE: Record<MistakeStage, MistakeStage | null> = {
  1: 3,
  3: 7,
  7: null,
};

/**
 * One user's progress on one quiz, across tracks (DP-37). Exists once the quiz was answered
 * (DP-27: answered = seen). Updated by QuizAnswered (context map), idempotently.
 */
export class QuizProgress {
  private constructor(private s: QuizProgressSnapshot) {}

  /** DP-27: the first answer makes a quiz seen. */
  static firstAnswer(event: QuizAnswered): QuizProgress {
    const day = LocalDate.parse(event.day);
    return new QuizProgress({
      userId: event.userId,
      quizId: event.quizId,
      lastAnsweredOn: day,
      lastAnsweredAt: new Date(event.answeredAt),
      lastSessionId: event.sessionId,
      // DP-08, DP-33: wrong → comes back the next day.
      mistake: event.correct ? null : { stage: 1, dueOn: day.addDays(1) },
      version: 0,
    });
  }

  /** Rebuilds stored progress. Only infrastructure mappers call this. */
  static reconstitute(s: QuizProgressSnapshot): QuizProgress {
    return new QuizProgress({ ...s });
  }

  get quizId() {
    return this.s.quizId;
  }
  get userId() {
    return this.s.userId;
  }
  get mistake(): Mistake | null {
    return this.s.mistake;
  }
  get lastAnsweredAt(): Date {
    return this.s.lastAnsweredAt;
  }
  get version() {
    return this.s.version;
  }

  /**
   * DP-33, counted from the day of each answer:
   *   wrong (any time)           → back the next day
   *   right on a 1-day comeback  → in 3 days
   *   right on a 3-day comeback  → in 7 days
   *   right on a 7-day comeback  → retired
   * Applying the same session's answer twice changes nothing (returns false), and neither
   * does an answer older than the last one applied: a retried event can arrive after a
   * newer one (ADR-014), and the schedule follows the latest answer.
   */
  apply(event: QuizAnswered): boolean {
    if (event.sessionId === this.s.lastSessionId) return false;
    if (new Date(event.answeredAt) < this.s.lastAnsweredAt) return false;
    const day = LocalDate.parse(event.day);
    let mistake: Mistake | null;
    if (!event.correct) mistake = { stage: 1, dueOn: day.addDays(1) };
    else if (!this.s.mistake) mistake = null;
    else {
      const next = NEXT_STAGE[this.s.mistake.stage];
      mistake = next ? { stage: next, dueOn: day.addDays(next) } : null;
    }
    this.s = {
      ...this.s,
      lastAnsweredOn: day,
      lastAnsweredAt: new Date(event.answeredAt),
      lastSessionId: event.sessionId,
      mistake,
    };
    return true;
  }

  /** DP-30: a mistake whose day has come (missed days included). */
  isDueOn(today: LocalDate): boolean {
    return this.s.mistake !== null && !this.s.mistake.dueOn.isAfter(today);
  }

  toSnapshot(): QuizProgressSnapshot {
    return { ...this.s };
  }
}
