/**
 * QB-06: how the app shows a quiz. Daily Practice keeps its own copy of the list
 * (a domain must not import another context); the Question Bank owns it.
 */
export const QUIZ_KINDS = [
  'single',
  'singleAudio',
  'readingGroup',
  'audioGroup',
] as const;
export type QuizKind = (typeof QUIZ_KINDS)[number];

export const isQuizKind = (value: unknown): value is QuizKind =>
  QUIZ_KINDS.includes(value as QuizKind);

/** DP-16: kinds whose questions are heard, not read. */
export const isAudioKind = (kind: QuizKind) =>
  kind === 'singleAudio' || kind === 'audioGroup';
