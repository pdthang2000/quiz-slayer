import { Inject, Injectable } from '@nestjs/common';
import { QUESTION_NOTE_REPOSITORY } from '../daily-practice.tokens';
import type { DailySession } from '../domain/daily-session';
import type { QuestionNoteRepository } from '../domain/repositories';
import { toSessionView, type DailySessionView, type ReadTime } from './views';

/** A session as a screen sees it, with the latest note of each answered question (DP-45, DP-48). */
@Injectable()
export class SessionReader {
  constructor(
    @Inject(QUESTION_NOTE_REPOSITORY)
    private readonly notes: QuestionNoteRepository,
  ) {}

  async view(session: DailySession, time: ReadTime): Promise<DailySessionView> {
    const notes = await this.notes.findMany(
      session.userId,
      session.answeredQuestionIds,
    );
    return toSessionView(
      session,
      time,
      new Map(notes.map((n) => [n.questionId, n])),
    );
  }
}
