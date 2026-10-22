declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

/** Branded so a CardId can't be passed where a TagId is expected. */
export type UserId = Brand<string, 'UserId'>;
export type CardId = Brand<string, 'CardId'>;
export type TagId = Brand<string, 'TagId'>;

export const UserId = (value: string) => value as UserId;
export const CardId = (value: string) => value as CardId;
export const TagId = (value: string) => value as TagId;
