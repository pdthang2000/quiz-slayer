import { Module } from '@nestjs/common';
import { ImportQuizSet } from './application/import-quiz-set';
import {
  GetQuizzesForPractice,
  ListPoolQuizIds,
  ListQuestionTags,
} from './application/queries';
import { PrismaQuestionBankQueries } from './infrastructure/prisma-question-bank.queries';
import { PrismaQuizSetRepository } from './infrastructure/prisma-quiz-set.repository';
import {
  QUESTION_BANK_QUERIES,
  QUIZ_SET_REPOSITORY,
} from './question-bank.tokens';

/** Question Bank (supporting). Exports its public application services only. */
@Module({
  providers: [
    { provide: QUIZ_SET_REPOSITORY, useClass: PrismaQuizSetRepository },
    { provide: QUESTION_BANK_QUERIES, useClass: PrismaQuestionBankQueries },
    ImportQuizSet,
    ListPoolQuizIds,
    GetQuizzesForPractice,
    ListQuestionTags,
  ],
  exports: [
    ImportQuizSet,
    ListPoolQuizIds,
    GetQuizzesForPractice,
    ListQuestionTags,
  ],
})
export class QuestionBankModule {}
