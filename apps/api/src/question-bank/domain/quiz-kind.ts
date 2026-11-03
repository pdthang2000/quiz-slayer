/** QB-06: how the app shows a quiz. A field, never a tag (QB-09). */
export const QUIZ_KINDS = [
  'single',
  'singleAudio',
  'readingGroup',
  'audioGroup',
] as const;
export type QuizKind = (typeof QUIZ_KINDS)[number];

export const isQuizKind = (value: unknown): value is QuizKind =>
  QUIZ_KINDS.includes(value as QuizKind);

/** QB-06: groups share a passage or audio and hold 2–4 questions. */
export const isGroupKind = (kind: QuizKind) =>
  kind === 'readingGroup' || kind === 'audioGroup';
