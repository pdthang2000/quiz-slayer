/**
 * Questions left the Question Bank (a re-import dropped them). Other contexts drop what
 * they keep per question (DP-51). Nothing is raised when a question is only fixed: it keeps
 * its id.
 */
export type QuestionsDeleted = {
  readonly type: 'QuestionsDeleted';
  readonly questionIds: readonly string[];
};
