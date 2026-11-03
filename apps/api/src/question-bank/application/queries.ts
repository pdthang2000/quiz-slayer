import { Inject, Injectable } from '@nestjs/common';
import type { QuizId, UserId } from '../domain/ids';
import type { QuizKind } from '../domain/quiz-kind';
import { QUESTION_BANK_QUERIES } from '../question-bank.tokens';
import type {
  QuestionBankQueries,
  QuestionTagWithCount,
  QuizContent,
} from './question-bank-queries';

// The Question Bank's public application services (context map: pools read by Daily
// Practice). Other contexts use these classes, never the tables.

/** DP-11, DP-12, QB-10 */
@Injectable()
export class ListPoolQuizIds {
  constructor(
    @Inject(QUESTION_BANK_QUERIES)
    private readonly queries: QuestionBankQueries,
  ) {}

  execute(input: {
    userId: UserId;
    tagName: string;
    kinds: readonly QuizKind[];
  }): Promise<QuizId[]> {
    return this.queries.poolQuizIds(input.userId, input.tagName, input.kinds);
  }
}

/** QB-04: what Daily Practice copies into a session's snapshot. */
@Injectable()
export class GetQuizzesForPractice {
  constructor(
    @Inject(QUESTION_BANK_QUERIES)
    private readonly queries: QuestionBankQueries,
  ) {}

  execute(input: {
    userId: UserId;
    quizIds: readonly QuizId[];
  }): Promise<QuizContent[]> {
    return this.queries.quizzesByIds(input.userId, input.quizIds);
  }
}

/** G-2 */
@Injectable()
export class ListQuestionTags {
  constructor(
    @Inject(QUESTION_BANK_QUERIES)
    private readonly queries: QuestionBankQueries,
  ) {}

  execute(input: { userId: UserId }): Promise<QuestionTagWithCount[]> {
    return this.queries.tagsWithCounts(input.userId);
  }
}
