import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  QuestionBankQueries,
  QuestionTagWithCount,
  QuizContent,
} from '../application/question-bank-queries';
import { QuizId, type UserId } from '../domain/ids';
import type { QuizKind } from '../domain/quiz-kind';
import { toDbKind, toKind, toQuestion } from './quiz-set.mapper';

/** QB-10: System content (no owner) and the user's own. Other users' public sets come later. */
const usableBy = (userId: UserId): Prisma.QuizWhereInput => ({
  quizSet: { OR: [{ ownerUserId: null }, { ownerUserId: userId }] },
});

@Injectable()
export class PrismaQuestionBankQueries implements QuestionBankQueries {
  constructor(private readonly prisma: PrismaService) {}

  async poolQuizIds(
    userId: UserId,
    tagName: string,
    kinds: readonly QuizKind[],
  ): Promise<QuizId[]> {
    const rows = await this.prisma.db.quiz.findMany({
      where: {
        ...usableBy(userId),
        kind: { in: kinds.map(toDbKind) },
        tags: { some: { name: tagName } },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => QuizId(r.id));
  }

  async quizzesByIds(
    userId: UserId,
    quizIds: readonly QuizId[],
  ): Promise<QuizContent[]> {
    if (quizIds.length === 0) return [];
    const rows = await this.prisma.db.quiz.findMany({
      where: { ...usableBy(userId), id: { in: [...quizIds] } },
      include: { questions: { orderBy: { position: 'asc' } } },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return quizIds.flatMap((id) => {
      const r = byId.get(id);
      if (!r) return [];
      return [
        {
          id: QuizId(r.id),
          kind: toKind(r.kind),
          passage: r.passage ?? undefined,
          audioUrl: r.audioUrl ?? undefined,
          questions: r.questions.map((q) => {
            const {
              id,
              text,
              imageUrl,
              audioUrl,
              choices,
              correctChoice,
              explanation,
            } = toQuestion(q);
            return {
              id,
              text,
              imageUrl,
              audioUrl,
              choices,
              correctChoice,
              explanation,
            };
          }),
        },
      ];
    });
  }

  /** Read-only raw SQL (allowed: it changes no data). A–Z, ignoring case. */
  async tagsWithCounts(userId: UserId): Promise<QuestionTagWithCount[]> {
    const rows = await this.prisma.db.$queryRaw<
      { name: string; quiz_count: bigint }[]
    >`
      SELECT t.name, COUNT(*) AS quiz_count
      FROM quiz_tag t
      JOIN quiz q ON q.id = t.quiz_id
      JOIN quiz_set s ON s.id = q.quiz_set_id
      WHERE s.owner_user_id IS NULL OR s.owner_user_id = ${userId}::uuid
      GROUP BY t.name
      ORDER BY lower(t.name), t.name`;
    return rows.map((r) => ({ name: r.name, quizCount: Number(r.quiz_count) }));
  }
}
