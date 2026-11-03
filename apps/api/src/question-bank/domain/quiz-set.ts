import { InvalidQuiz } from './errors';
import type { QuestionId, QuizId, QuizSetId, UserId } from './ids';
import { QuestionTagName } from './question-tag-name';
import { isGroupKind, isQuizKind, type QuizKind } from './quiz-kind';

export type Visibility = 'Private' | 'Public';

/** DP-07: one multiple-choice question. */
export type Question = {
  id: QuestionId;
  externalId: string;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  /** 2–6 choices. */
  choices: string[];
  /** The Answer Key: index into `choices`. */
  correctChoice: number;
  explanation?: string;
};

/** QB-06, DP-17: a single question, or a group with its passage or audio. */
export type Quiz = {
  id: QuizId;
  externalId: string;
  kind: QuizKind;
  passage?: string;
  audioUrl?: string;
  questions: Question[];
  /** QB-07, QB-08: on the quiz (the group), deduplicated, normalized. */
  tags: string[];
};

export type QuizInput = Omit<Quiz, 'kind' | 'tags' | 'questions'> & {
  kind: string;
  tags: readonly string[];
  questions: Question[];
};

const MIN_CHOICES = 2;
const MAX_CHOICES = 6;
const MIN_GROUP = 2;
const MAX_GROUP = 4;

/** QB-06, DP-07: checks a quiz against its kind. */
export function checkQuiz(input: QuizInput): Quiz {
  const bad = (reason: string) => new InvalidQuiz(input.externalId, reason);
  if (!isQuizKind(input.kind)) throw bad(`unknown kind "${input.kind}"`);
  const kind = input.kind;
  const n = input.questions.length;
  if (isGroupKind(kind)) {
    if (n < MIN_GROUP || n > MAX_GROUP) throw bad('a group has 2–4 questions');
    if (kind === 'readingGroup' && !input.passage?.trim())
      throw bad('a reading group needs a passage');
    if (kind === 'audioGroup' && !input.audioUrl)
      throw bad('an audio group needs audio');
  } else {
    if (n !== 1) throw bad('a single quiz has one question');
    if (input.passage) throw bad('only a reading group has a passage');
    if (
      kind === 'singleAudio' &&
      !input.audioUrl &&
      !input.questions[0].audioUrl
    ) {
      throw bad('a single audio question needs audio');
    }
  }
  for (const q of input.questions) {
    if (!q.text.trim() && !q.imageUrl && !q.audioUrl)
      throw bad(`question "${q.externalId}" is empty`);
    if (q.choices.length < MIN_CHOICES || q.choices.length > MAX_CHOICES) {
      throw bad(`question "${q.externalId}" needs 2–6 choices`);
    }
    if (q.choices.some((c) => !c.trim()))
      throw bad(`question "${q.externalId}" has an empty choice`);
    if (
      !Number.isInteger(q.correctChoice) ||
      q.correctChoice < 0 ||
      q.correctChoice >= q.choices.length
    ) {
      throw bad(`question "${q.externalId}" needs one correct choice`);
    }
  }
  const tags = [
    ...new Set(input.tags.map((t) => QuestionTagName.create(t).value)),
  ];
  return { ...input, kind, tags };
}

export type QuizSetSnapshot = {
  id: QuizSetId;
  /** null = System content (QB-10). */
  ownerUserId: UserId | null;
  name: string;
  visibility: Visibility;
  quizzes: Quiz[];
};

/** One uploaded test (Quiz Set): its quizzes and their question tags (QB-01, QB-07, QB-11). */
export class QuizSet {
  private constructor(private readonly s: QuizSetSnapshot) {}

  /** QB-02: a new Quiz Set is Private. */
  static create(input: {
    id: QuizSetId;
    ownerUserId: UserId | null;
    name: string;
    quizzes: QuizInput[];
  }): QuizSet {
    return new QuizSet({
      id: input.id,
      ownerUserId: input.ownerUserId,
      name: input.name,
      visibility: 'Private',
      quizzes: QuizSet.checkAll(input.quizzes),
    });
  }

  /** Rebuilds a stored Quiz Set. Only infrastructure mappers call this. */
  static reconstitute(s: QuizSetSnapshot): QuizSet {
    return new QuizSet({ ...s });
  }

  /**
   * Re-import (seed): the quizzes are replaced by the file's. A quiz keeps its id when its
   * external id is the same (so progress and past sessions still point at it, DP-38).
   */
  replaceQuizzes(quizzes: QuizInput[]): void {
    const byExternal = new Map(this.s.quizzes.map((q) => [q.externalId, q]));
    this.s.quizzes = QuizSet.checkAll(quizzes).map((q) => {
      const old = byExternal.get(q.externalId);
      if (!old) return q;
      const oldQuestions = new Map(
        old.questions.map((x) => [x.externalId, x.id]),
      );
      return {
        ...q,
        id: old.id,
        questions: q.questions.map((x) => ({
          ...x,
          id: oldQuestions.get(x.externalId) ?? x.id,
        })),
      };
    });
  }

  get id() {
    return this.s.id;
  }
  get ownerUserId() {
    return this.s.ownerUserId;
  }
  get name() {
    return this.s.name;
  }
  get visibility() {
    return this.s.visibility;
  }
  get quizzes(): readonly Quiz[] {
    return this.s.quizzes;
  }

  toSnapshot(): QuizSetSnapshot {
    return { ...this.s, quizzes: [...this.s.quizzes] };
  }

  private static checkAll(quizzes: QuizInput[]): Quiz[] {
    const ids = new Set<string>();
    return quizzes.map((input) => {
      if (ids.has(input.externalId))
        throw new InvalidQuiz(input.externalId, 'duplicate id');
      ids.add(input.externalId);
      return checkQuiz(input);
    });
  }
}
