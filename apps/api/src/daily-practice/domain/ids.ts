declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

/** Branded so a QuizId can't be passed where a TrackId is expected. */
export type UserId = Brand<string, 'UserId'>;
export type TrackId = Brand<string, 'TrackId'>;
export type DailySessionId = Brand<string, 'DailySessionId'>;
/** A quiz of the Question Bank: a single question or a group (DP-17). */
export type QuizId = Brand<string, 'QuizId'>;
export type QuestionId = Brand<string, 'QuestionId'>;

export const UserId = (value: string) => value as UserId;
export const TrackId = (value: string) => value as TrackId;
export const DailySessionId = (value: string) => value as DailySessionId;
export const QuizId = (value: string) => value as QuizId;
export const QuestionId = (value: string) => value as QuestionId;
