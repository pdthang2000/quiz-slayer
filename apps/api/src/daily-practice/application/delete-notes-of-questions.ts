import { Inject, Injectable } from '@nestjs/common';
import { QUESTION_NOTE_REPOSITORY } from '../daily-practice.tokens';
import { QuestionId } from '../domain/ids';
import type { QuestionNoteRepository } from '../domain/repositories';

/** DP-51: deleting a question deletes its notes. Reacts to Question Bank's QuestionsDeleted. */
@Injectable()
export class DeleteNotesOfQuestions {
  constructor(
    @Inject(QUESTION_NOTE_REPOSITORY)
    private readonly notes: QuestionNoteRepository,
  ) {}

  handle(event: { questionIds: readonly string[] }): Promise<void> {
    return this.notes.deleteOfQuestions(event.questionIds.map(QuestionId));
  }
}
