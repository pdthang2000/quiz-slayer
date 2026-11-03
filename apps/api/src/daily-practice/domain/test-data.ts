// Builders for domain tests (no framework, no DB).
import { DailySession } from './daily-session';
import { DailySessionId, QuestionId, QuizId, TrackId, UserId } from './ids';
import { LocalDate } from './local-date';
import type { QuestionSnapshot, QuizSnapshot } from './quiz-snapshot';

export const USER = UserId('u1');
export const TRACK = TrackId('t1');

export const question = (
  id: string,
  over: Partial<QuestionSnapshot> = {},
): QuestionSnapshot => ({
  id: QuestionId(id),
  text: `question ${id}`,
  choices: ['A1', 'B1', 'C1', 'D1'],
  correctChoice: 0,
  ...over,
});

export const single = (
  id: string,
  over: Partial<QuestionSnapshot> = {},
): QuizSnapshot => ({
  id: QuizId(id),
  kind: 'single',
  questions: [question(`${id}-q`, over)],
});

export const readingGroup = (id: string, size = 3): QuizSnapshot => ({
  id: QuizId(id),
  kind: 'readingGroup',
  passage: `passage ${id}`,
  questions: Array.from({ length: size }, (_, i) =>
    question(`${id}-q${i + 1}`),
  ),
});

export function startSession(
  quizzes: QuizSnapshot[],
  over: Partial<Parameters<typeof DailySession.start>[0]> = {},
): DailySession {
  return DailySession.start({
    id: DailySessionId('s1'),
    userId: USER,
    trackId: TRACK,
    tagName: 'HSK4',
    day: LocalDate.parse('2026-11-07'),
    timeZone: 'Asia/Ho_Chi_Minh',
    startedAt: new Date('2026-11-07T01:00:00Z'),
    dailySize: 10,
    quizzes,
    ...over,
  });
}
