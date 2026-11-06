import type { QuestionId, QuizId } from './ids';
import { type QuizKind } from './quiz-kind';

/**
 * What a daily session keeps of a quiz when it starts (QB-04, context map): fixing the
 * Question Bank later never changes a past session.
 */
export type QuestionSnapshot = {
  readonly id: QuestionId;
  readonly text: string;
  /** DP-07: a question may be an image or audio too. Only set when it has one. */
  readonly imageUrl?: string;
  readonly audioUrl?: string;
  /** DP-07: 2–6 choices. */
  readonly choices: readonly string[];
  /** Index into `choices` (the Answer Key). */
  readonly correctChoice: number;
  readonly explanation?: string;
};

export type QuizSnapshot = {
  readonly id: QuizId;
  readonly kind: QuizKind;
  /** QB-06: the shared material of a group. */
  readonly passage?: string;
  readonly audioUrl?: string;
  /** One question for single kinds; 2–4 for groups (QB-06). */
  readonly questions: readonly QuestionSnapshot[];
};

/** CARD-02: a card's limits, in code points after NFC + trim (CARD-05). */
export const CARD_FRONT_MAX = 500;
export const CARD_BACK_MAX = 3000;

const LETTERS = 'ABCDEF';

/** DP-40: what "Save as card" creates. */
export type CardDraft = { front: string; back: string; tagName: string };

/**
 * DP-40: front = the question and its choices, back = the correct answer and the
 * explanation, tag = the track's tag. DP-49: the note goes on the back, below the explanation.
 *   Front: 我___学生。  A 是  B 在  C 有  D 去
 *   Back:  是 — 是 = to be
 *          📝 是 joins two nouns, 在 is for places
 */
export function cardDraftFor(
  question: QuestionSnapshot,
  tagName: string,
  note: string | null = null,
): CardDraft {
  const choices = question.choices
    .map((c, i) => `${LETTERS[i]} ${c}`)
    .join('  ');
  const answer = question.choices[question.correctChoice];
  const back = question.explanation
    ? `${answer} — ${question.explanation}`
    : answer;
  return {
    front: `${question.text}  ${choices}`,
    back: note ? `${back}\n📝 ${note}` : back,
    tagName,
  };
}

const cardLength = (text: string) => [...text.normalize('NFC').trim()].length;

/** DP-64: a card that fits saves with one tap; one that doesn't opens the card editor. */
export const cardFits = (draft: CardDraft): boolean =>
  cardLength(draft.front) <= CARD_FRONT_MAX &&
  cardLength(draft.back) <= CARD_BACK_MAX;

/**
 * DP-16, DP-40: "Save as card" only for a single question that makes sense on its own:
 * kind single, text only (no image, no audio, not in a group). Length never hides the
 * button (DP-64).
 */
export function canBeSavedAsCard(quiz: QuizSnapshot): boolean {
  if (
    quiz.kind !== 'single' ||
    quiz.questions.length !== 1 ||
    quiz.passage ||
    quiz.audioUrl
  ) {
    return false;
  }
  const [q] = quiz.questions;
  return !q.imageUrl && !q.audioUrl;
}
