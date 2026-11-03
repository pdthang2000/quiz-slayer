declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type QuizSetId = Brand<string, 'QuizSetId'>;
export type QuizId = Brand<string, 'QuizId'>;
export type QuestionId = Brand<string, 'QuestionId'>;

export const UserId = (value: string) => value as UserId;
export const QuizSetId = (value: string) => value as QuizSetId;
export const QuizId = (value: string) => value as QuizId;
export const QuestionId = (value: string) => value as QuestionId;
