import type { DailySession } from '../domain/daily-session';
import type { QuestionId } from '../domain/ids';
import type { QuestionNote } from '../domain/question-note';
import type { QuizKind } from '../domain/quiz-kind';
import { cardFits, type CardDraft } from '../domain/quiz-snapshot';
import type { Track } from '../domain/track';

// Read types: plain data for screens (ADR-013). The correct choice of a quiz is only sent
// once that quiz is answered (DP-20), never before.

export type TrackView = {
  id: string;
  tagName: string;
  kinds: QuizKind[];
  dailySize: number;
  /** DP-53, CONFLICT-01: sent back with settings and remove. */
  version: number;
};

export type AnsweredQuestionView = {
  questionId: string;
  chosen: number;
  correctChoice: number;
  correct: boolean;
  explanation?: string;
  /** DP-10, DP-16, DP-40: show the "Save as card" button. */
  canSaveAsCard: boolean;
  /** DP-32: show "Saved ✓". */
  savedAsCard: boolean;
  /**
   * DP-64: only when the card doesn't fit: Save as card opens the editor with this.
   * Absent = one tap saves.
   */
  cardDraft?: CardDraft;
  /** DP-45, DP-48: the latest note; null = none. */
  note: string | null;
  /** DP-50: sent back when saving the note; 0 = no note stored yet. */
  noteVersion: number;
};

export type QuizView = {
  id: string;
  kind: QuizKind;
  passage?: string;
  audioUrl?: string;
  questions: {
    id: string;
    text: string;
    imageUrl?: string;
    audioUrl?: string;
    choices: string[];
  }[];
  /** Present once answered (DP-20, DP-26). */
  answer?: { questions: AnsweredQuestionView[] };
};

export type DailySessionView = {
  id: string;
  trackId: string;
  tagName: string;
  /** DP-05: YYYY-MM-DD. */
  day: string;
  dailySize: number;
  /** DP-14: fewer quizzes than the daily size ("Only N quizzes match your settings"). */
  short: boolean;
  finished: boolean;
  /** DP-52: no more answers can be given; the set can only be viewed. */
  closed: boolean;
  /** DP-18: quizzes. */
  progress: { answered: number; total: number };
  /** DP-18: questions. */
  result: { correct: number; total: number };
  quizzes: QuizView[];
};

/** Today overview and history rows: a session without its quizzes. */
export type DailySessionSummary = Omit<
  DailySessionView,
  'quizzes' | 'tagName' | 'dailySize'
>;

/** When a screen is read, for DP-52; no timezone = an app too old to send it. */
export type ReadTime = { now: Date; timeZone: string | undefined };

export const toTrackView = (t: Track): TrackView => ({
  id: t.id,
  tagName: t.tagName,
  kinds: [...t.kinds],
  dailySize: t.dailySize,
  version: t.version,
});

export function toSessionSummary(
  s: DailySession,
  time: ReadTime,
): DailySessionSummary {
  return {
    id: s.id,
    trackId: s.trackId,
    day: s.day.value,
    short: s.isShort,
    finished: s.isFinished,
    closed: s.isClosedAt(time.now, time.timeZone),
    progress: s.progress,
    result: s.result,
  };
}

export function toSessionView(
  s: DailySession,
  time: ReadTime,
  notes: ReadonlyMap<QuestionId, QuestionNote>,
): DailySessionView {
  const snap = s.toSnapshot();
  return {
    ...toSessionSummary(s, time),
    tagName: snap.tagName,
    dailySize: snap.dailySize,
    quizzes: snap.quizzes.map((quiz): QuizView => {
      const answer = s.answerOf(quiz.id);
      return {
        id: quiz.id,
        kind: quiz.kind,
        passage: quiz.passage,
        audioUrl: quiz.audioUrl,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          text: q.text,
          imageUrl: q.imageUrl,
          audioUrl: q.audioUrl,
          choices: [...q.choices],
        })),
        answer: answer && {
          questions: s.feedbackFor(quiz, answer.choices).questions.map((f) => {
            const note = notes.get(f.questionId);
            const canSaveAsCard = s.canSaveAsCard(f.questionId);
            const draft = canSaveAsCard
              ? s.cardDraftFor(f.questionId, note?.text ?? null)
              : null;
            return {
              ...f,
              canSaveAsCard,
              savedAsCard: s.isSavedAsCard(f.questionId),
              cardDraft: draft && !cardFits(draft) ? draft : undefined,
              note: note?.text ?? null,
              noteVersion: note?.version ?? 0,
            };
          }),
        },
      };
    }),
  };
}
