import { Inject, Module, type OnModuleInit } from '@nestjs/common';
import {
  OUTBOX_HANDLERS,
  type OutboxHandlers,
} from '../shared/application/outbox';
import { AnswerQuiz } from './application/answer-quiz';
import { ApplyQuizAnswered } from './application/apply-quiz-answered';
import {
  DAILY_SESSION_REPOSITORY,
  QUIZ_PROGRESS_REPOSITORY,
  TRACK_REPOSITORY,
} from './daily-practice.tokens';
import type { QuizAnswered } from './domain/events';
import {
  PrismaDailySessionRepository,
  PrismaQuizProgressRepository,
  PrismaTrackRepository,
} from './infrastructure/prisma-practice.repositories';
import { QuestionBankModule } from '../question-bank/question-bank.module';

/** Daily Practice (core). ADR-013. */
@Module({
  imports: [QuestionBankModule],
  providers: [
    { provide: TRACK_REPOSITORY, useClass: PrismaTrackRepository },
    {
      provide: DAILY_SESSION_REPOSITORY,
      useClass: PrismaDailySessionRepository,
    },
    {
      provide: QUIZ_PROGRESS_REPOSITORY,
      useClass: PrismaQuizProgressRepository,
    },
    ApplyQuizAnswered,
    AnswerQuiz,
  ],
})
export class DailyPracticeModule implements OnModuleInit {
  constructor(
    @Inject(OUTBOX_HANDLERS) private readonly handlers: OutboxHandlers,
    private readonly applyQuizAnswered: ApplyQuizAnswered,
  ) {}

  /** Context map: QuizProgress reacts to QuizAnswered through the outbox (B-10). */
  onModuleInit(): void {
    this.handlers.register('QuizAnswered', (event) =>
      this.applyQuizAnswered.handle(event as QuizAnswered),
    );
  }
}
