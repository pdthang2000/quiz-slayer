import type { QuizId, UserId } from '../domain/ids';
import type { QuizKind } from '../domain/quiz-kind';

// Read side: plain data for other contexts and screens. Infrastructure implements it.

/** A quiz as Daily Practice snapshots it (QB-04: the snapshot is Daily Practice's). */
export type QuizContent = {
  id: QuizId;
  kind: QuizKind;
  passage?: string;
  audioUrl?: string;
  questions: {
    id: string;
    text: string;
    imageUrl?: string;
    audioUrl?: string;
    choices: string[];
    correctChoice: number;
    explanation?: string;
  }[];
};

/** G-2: a question tag the user can follow, with how many quizzes it has. */
export type QuestionTagWithCount = { name: string; quizCount: number };

export interface QuestionBankQueries {
  /** DP-11, DP-12, QB-10: quizzes with this tag and one of these kinds, System + the user's own. */
  poolQuizIds(
    userId: UserId,
    tagName: string,
    kinds: readonly QuizKind[],
  ): Promise<QuizId[]>;
  /** QB-10: content of these quizzes, in the given order; ones the user can't use are left out. */
  quizzesByIds(
    userId: UserId,
    quizIds: readonly QuizId[],
  ): Promise<QuizContent[]>;
  /** G-2: question tags of System + own quizzes with quiz counts, A–Z. */
  tagsWithCounts(userId: UserId): Promise<QuestionTagWithCount[]>;
}
