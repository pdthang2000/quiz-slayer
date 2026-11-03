import { Inject, Injectable } from '@nestjs/common';
import { QUIZ_PROGRESS_REPOSITORY } from '../daily-practice.tokens';
import type { QuizAnswered } from '../domain/events';
import { QuizProgress } from '../domain/quiz-progress';
import type { QuizProgressRepository } from '../domain/repositories';

/**
 * DP-27, DP-33, DP-37: QuizProgress reacts to QuizAnswered (context map), delivered by the
 * outbox after the answer commits. Runs in the relay's transaction. Idempotent: the same
 * session's answer applied twice changes nothing (B-10 delivers at least once).
 */
@Injectable()
export class ApplyQuizAnswered {
  constructor(
    @Inject(QUIZ_PROGRESS_REPOSITORY)
    private readonly progress: QuizProgressRepository,
  ) {}

  async handle(event: QuizAnswered): Promise<void> {
    const existing = await this.progress.find(event.userId, event.quizId);
    if (!existing) {
      await this.progress.add(QuizProgress.firstAnswer(event));
      return;
    }
    if (existing.apply(event)) await this.progress.save(existing);
  }
}
