import { Inject, Module, type OnModuleInit } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CardLibraryModule } from '../card-library/card-library.module';
import { QuestionBankModule } from '../question-bank/question-bank.module';
import {
  OUTBOX_HANDLERS,
  type OutboxHandlers,
} from '../shared/application/outbox';
import { PracticeController } from './api/practice.controller';
import { PracticeErrorFilter } from './api/practice-error.filter';
import { AnswerQuiz } from './application/answer-quiz';
import { ApplyQuizAnswered } from './application/apply-quiz-answered';
import {
  GetDailySession,
  GetToday,
  ListTrackHistory,
  ListTrackOptions,
  ListTracks,
} from './application/queries';
import { SaveQuestionAsCard } from './application/save-question-as-card';
import { StartDailySession } from './application/start-daily-session';
import {
  AddTrack,
  ChangeTrackSettings,
  RemoveTrack,
} from './application/track-commands';
import {
  DAILY_PRACTICE_QUERIES,
  DAILY_SESSION_REPOSITORY,
  QUIZ_PROGRESS_REPOSITORY,
  TRACK_REPOSITORY,
} from './daily-practice.tokens';
import type { QuizAnswered } from './domain/events';
import { PrismaDailyPracticeQueries } from './infrastructure/prisma-daily-practice.queries';
import {
  PrismaDailySessionRepository,
  PrismaQuizProgressRepository,
  PrismaTrackRepository,
} from './infrastructure/prisma-practice.repositories';

/** Daily Practice (core). ADR-013. Uses Question Bank (pools) and Card Library (createCard). */
@Module({
  imports: [QuestionBankModule, CardLibraryModule],
  controllers: [PracticeController],
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
    { provide: DAILY_PRACTICE_QUERIES, useClass: PrismaDailyPracticeQueries },
    { provide: APP_FILTER, useClass: PracticeErrorFilter },
    ApplyQuizAnswered,
    AnswerQuiz,
    StartDailySession,
    SaveQuestionAsCard,
    AddTrack,
    RemoveTrack,
    ChangeTrackSettings,
    GetToday,
    GetDailySession,
    ListTrackHistory,
    ListTracks,
    ListTrackOptions,
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
