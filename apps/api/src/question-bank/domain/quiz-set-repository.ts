import type { QuizSetId, UserId } from './ids';
import type { QuizSet } from './quiz-set';

export interface QuizSetRepository {
  findById(id: QuizSetId): Promise<QuizSet | null>;
  /** Import: the owner's Quiz Set with this name (owner null = System). */
  findByOwnerAndName(
    ownerUserId: UserId | null,
    name: string,
  ): Promise<QuizSet | null>;
  /** Inserts or replaces the Quiz Set with its quizzes, questions and tags. */
  save(quizSet: QuizSet): Promise<void>;
}
