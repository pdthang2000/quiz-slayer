import { Prisma, QuizKind as DbKind } from '@prisma/client';
import { QuestionId, QuizId, QuizSetId, UserId } from '../domain/ids';
import type { QuizKind } from '../domain/quiz-kind';
import { type Question, type Quiz, QuizSet } from '../domain/quiz-set';

export const quizSetInclude = {
  quizzes: {
    orderBy: { position: 'asc' },
    include: { questions: { orderBy: { position: 'asc' } }, tags: true },
  },
} satisfies Prisma.QuizSetInclude;

type QuizSetRow = Prisma.QuizSetGetPayload<{ include: typeof quizSetInclude }>;
type QuestionRow = QuizSetRow['quizzes'][number]['questions'][number];

/** Prisma's enum values are the domain's kind codes (the DB names are mapped in the schema). */
export const toDbKind = (kind: QuizKind): DbKind => kind;
export const toKind = (kind: DbKind): QuizKind => kind;

const opt = (v: string | null) => v ?? undefined;

export function toQuestion(row: QuestionRow): Question {
  return {
    id: QuestionId(row.id),
    externalId: row.externalId,
    text: row.text,
    imageUrl: opt(row.imageUrl),
    audioUrl: opt(row.audioUrl),
    choices: row.choices,
    correctChoice: row.correctChoice,
    explanation: opt(row.explanation),
  };
}

export function toQuizSet(row: QuizSetRow): QuizSet {
  return QuizSet.reconstitute({
    id: QuizSetId(row.id),
    ownerUserId: row.ownerUserId ? UserId(row.ownerUserId) : null,
    name: row.name,
    visibility: row.visibility,
    quizzes: row.quizzes.map((q): Quiz => ({
      id: QuizId(q.id),
      externalId: q.externalId,
      kind: toKind(q.kind),
      passage: opt(q.passage),
      audioUrl: opt(q.audioUrl),
      questions: q.questions.map(toQuestion),
      tags: q.tags.map((t) => t.name),
    })),
  });
}
