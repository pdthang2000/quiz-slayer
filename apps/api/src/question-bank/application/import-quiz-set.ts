import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { OUTBOX, type Outbox } from '../../shared/application/outbox';
import type { TransactionRunner } from '../../shared/application/transaction-runner';
import { TRANSACTION_RUNNER } from '../../shared/application/transaction-runner';
import { QuestionId, QuizId, QuizSetId, type UserId } from '../domain/ids';
import { QuizSet, type QuizInput } from '../domain/quiz-set';
import type { QuizSetRepository } from '../domain/quiz-set-repository';
import { QUIZ_SET_REPOSITORY } from '../question-bank.tokens';

/** One quiz as it appears in an import file (v1: the seed file, content-ingestion.md). */
export type ImportedQuiz = {
  id: string;
  kind: string;
  tags?: string[];
  passage?: string;
  audio?: string;
  question?: string;
  image?: string;
  choices?: string[];
  answer?: number;
  explanation?: string;
  questions?: {
    id: string;
    question: string;
    image?: string;
    audio?: string;
    choices: string[];
    answer: number;
    explanation?: string;
  }[];
};

export type ImportFile = {
  quizSet: string;
  owner: 'system' | UserId;
  tags?: string[];
  quizzes: ImportedQuiz[];
};

/** File kinds are written in words (QB-06); the model uses codes. */
const KIND_CODES: Record<string, string> = {
  single: 'single',
  'single audio': 'singleAudio',
  'reading group': 'readingGroup',
  'audio group': 'audioGroup',
};

function toQuizInput(q: ImportedQuiz, fileTags: string[]): QuizInput {
  const questions = q.questions
    ? q.questions.map((x) => ({
        id: QuestionId(randomUUID()),
        externalId: x.id,
        text: x.question,
        imageUrl: x.image,
        audioUrl: x.audio,
        choices: x.choices,
        correctChoice: x.answer,
        explanation: x.explanation,
      }))
    : [
        {
          id: QuestionId(randomUUID()),
          externalId: q.id,
          text: q.question ?? '',
          imageUrl: q.image,
          choices: q.choices ?? [],
          correctChoice: q.answer ?? -1,
          explanation: q.explanation,
        },
      ];
  return {
    id: QuizId(randomUUID()),
    externalId: q.id,
    kind: KIND_CODES[q.kind] ?? q.kind,
    passage: q.passage,
    audioUrl: q.audio,
    questions,
    tags: [...fileTags, ...(q.tags ?? [])],
  };
}

/**
 * Imports a Quiz Set file (v1: the seed script). Re-importing the same set (same owner and
 * name) replaces its quizzes and keeps the ids of quizzes with the same file id.
 */
@Injectable()
export class ImportQuizSet {
  constructor(
    @Inject(QUIZ_SET_REPOSITORY) private readonly quizSets: QuizSetRepository,
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(OUTBOX) private readonly outbox: Outbox,
  ) {}

  async execute(
    file: ImportFile,
  ): Promise<{ quizSetId: QuizSetId; quizCount: number }> {
    const owner = file.owner === 'system' ? null : file.owner;
    const quizzes = file.quizzes.map((q) => toQuizInput(q, file.tags ?? []));
    const result = await this.transactions.run(async () => {
      let set = await this.quizSets.findByOwnerAndName(owner, file.quizSet);
      if (set) set.replaceQuizzes(quizzes);
      else {
        set = QuizSet.create({
          id: QuizSetId(randomUUID()),
          ownerUserId: owner,
          name: file.quizSet,
          quizzes,
        });
      }
      await this.quizSets.save(set);
      await this.outbox.add(set.pullEvents());
      return { quizSetId: set.id, quizCount: set.quizzes.length };
    });
    this.outbox.deliverSoon();
    return result;
  }
}
