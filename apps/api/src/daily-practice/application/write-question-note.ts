import { Inject, Injectable } from '@nestjs/common';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../shared/application/transaction-runner';
import {
  DAILY_SESSION_REPOSITORY,
  QUESTION_NOTE_REPOSITORY,
} from '../daily-practice.tokens';
import type { DailySessionId, QuestionId, UserId } from '../domain/ids';
import { QuestionNote } from '../domain/question-note';
import type {
  DailySessionRepository,
  QuestionNoteRepository,
} from '../domain/repositories';
import { DailySessionNotFound } from './errors';

/**
 * DP-41, DP-45: writes the note on a question answered in that session, also on a closed
 * set (DP-68). DP-46: empty text removes it. DP-50: `version` is the one the screen showed.
 * The session is only read; the note is the one aggregate changed.
 */
@Injectable()
export class WriteQuestionNote {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(DAILY_SESSION_REPOSITORY)
    private readonly sessions: DailySessionRepository,
    @Inject(QUESTION_NOTE_REPOSITORY)
    private readonly notes: QuestionNoteRepository,
  ) {}

  execute(input: {
    userId: UserId;
    sessionId: DailySessionId;
    questionId: QuestionId;
    text: string;
    version: number;
  }): Promise<{ text: string | null; version: number }> {
    return this.transactions.run(async () => {
      const session = await this.sessions.findById(
        input.userId,
        input.sessionId,
      );
      if (!session) throw new DailySessionNotFound(input.sessionId);
      session.assertCanWriteNote(input.questionId);

      const note =
        (await this.notes.find(input.userId, input.questionId)) ??
        QuestionNote.none(input.userId, input.questionId);
      note.write(input.text, input.version);
      if (!note.isStored && note.text === null) {
        return { text: null, version: 0 }; // nothing to remove
      }
      if (note.isStored) await this.notes.save(note);
      else await this.notes.add(note);
      return { text: note.text, version: note.version + 1 };
    });
  }
}
