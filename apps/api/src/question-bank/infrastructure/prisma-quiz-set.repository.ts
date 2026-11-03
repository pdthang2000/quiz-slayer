import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { QuizSetId, UserId } from '../domain/ids';
import type { QuizSet } from '../domain/quiz-set';
import type { QuizSetRepository } from '../domain/quiz-set-repository';
import { quizSetInclude, toDbKind, toQuizSet } from './quiz-set.mapper';

@Injectable()
export class PrismaQuizSetRepository implements QuizSetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: QuizSetId): Promise<QuizSet | null> {
    const row = await this.prisma.db.quizSet.findUnique({
      where: { id },
      include: quizSetInclude,
    });
    return row ? toQuizSet(row) : null;
  }

  async findByOwnerAndName(
    ownerUserId: UserId | null,
    name: string,
  ): Promise<QuizSet | null> {
    const row = await this.prisma.db.quizSet.findFirst({
      where: { ownerUserId, name },
      include: quizSetInclude,
    });
    return row ? toQuizSet(row) : null;
  }

  /** Writes the set, its quizzes, questions and tags; quizzes no longer in the set are deleted. */
  save(set: QuizSet): Promise<void> {
    const s = set.toSnapshot();
    return this.prisma.runInTransaction(async () => {
      const db = this.prisma.db;
      await db.quizSet.upsert({
        where: { id: s.id },
        create: {
          id: s.id,
          ownerUserId: s.ownerUserId,
          name: s.name,
          visibility: s.visibility,
        },
        update: { name: s.name, visibility: s.visibility },
      });
      await db.quiz.deleteMany({
        where: { quizSetId: s.id, id: { notIn: s.quizzes.map((q) => q.id) } },
      });
      for (const [position, quiz] of s.quizzes.entries()) {
        const data = {
          externalId: quiz.externalId,
          kind: toDbKind(quiz.kind),
          passage: quiz.passage ?? null,
          audioUrl: quiz.audioUrl ?? null,
          position,
        };
        await db.quiz.upsert({
          where: { id: quiz.id },
          create: { id: quiz.id, quizSetId: s.id, ...data },
          update: data,
        });
        await db.question.deleteMany({
          where: {
            quizId: quiz.id,
            id: { notIn: quiz.questions.map((q) => q.id) },
          },
        });
        for (const [i, q] of quiz.questions.entries()) {
          const qData = {
            externalId: q.externalId,
            position: i,
            text: q.text,
            imageUrl: q.imageUrl ?? null,
            audioUrl: q.audioUrl ?? null,
            choices: q.choices,
            correctChoice: q.correctChoice,
            explanation: q.explanation ?? null,
          };
          await db.question.upsert({
            where: { id: q.id },
            create: { id: q.id, quizId: quiz.id, ...qData },
            update: qData,
          });
        }
        await db.quizTag.deleteMany({ where: { quizId: quiz.id } });
        await db.quizTag.createMany({
          data: quiz.tags.map((name) => ({ quizId: quiz.id, name })),
        });
      }
    });
  }
}
