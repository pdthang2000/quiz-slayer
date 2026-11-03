import type { DailySession } from '../domain/daily-session';
import type { QuizKind } from '../domain/quiz-kind';
import type { Track } from '../domain/track';

// Read types: plain data for screens (ADR-013). The correct choice of a quiz is only sent
// once that quiz is answered (DP-20), never before.

export type TrackView = {
  id: string;
  tagName: string;
  kinds: QuizKind[];
  dailySize: number;
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

export const toTrackView = (t: Track): TrackView => ({
  id: t.id,
  tagName: t.tagName,
  kinds: [...t.kinds],
  dailySize: t.dailySize,
});

export function toSessionSummary(s: DailySession): DailySessionSummary {
  return {
    id: s.id,
    trackId: s.trackId,
    day: s.day.value,
    short: s.isShort,
    finished: s.isFinished,
    progress: s.progress,
    result: s.result,
  };
}

export function toSessionView(s: DailySession): DailySessionView {
  const snap = s.toSnapshot();
  return {
    ...toSessionSummary(s),
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
          questions: s.feedbackFor(quiz, answer.choices).questions.map((f) => ({
            ...f,
            canSaveAsCard: s.canSaveAsCard(f.questionId),
            savedAsCard: s.isSavedAsCard(f.questionId),
          })),
        },
      };
    }),
  };
}
