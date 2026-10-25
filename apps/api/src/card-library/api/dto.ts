import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

// Request shape only. Business rules (lengths, tag names, limits) live in the domain.

/**
 * Shape guard against oversized requests, not a business rule: the 20-tag limit
 * (CARDTAG-03) stays in the domain, because duplicates count once (CARDTAG-06).
 */
const MAX_TAGS_IN_REQUEST = 100;

/** "<epoch millis>_<uuid>", as returned in nextCursor. */
const CURSOR = /^\d{1,15}_[0-9a-f-]{36}$/;

/** CARD-07: front, back and the full tag list, as the editor shows them. */
export class CardInputDto {
  @IsString()
  front!: string;

  @IsString()
  back!: string;

  @IsArray()
  @ArrayMaxSize(MAX_TAGS_IN_REQUEST)
  @IsString({ each: true })
  tags!: string[];
}

/** CARD-07 + CARD-08: the version the editor was shown. */
export class EditCardDto extends CardInputDto {
  @IsInt()
  @Min(0)
  version!: number;
}

export class ListCardsQueryDto {
  /** READ-03 */
  @IsOptional()
  @IsString()
  q?: string;

  /** READ-05: ?tag=<id>&tag=<id> */
  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown[] =>
    Array.isArray(value) ? (value as unknown[]) : [value],
  )
  @ArrayMaxSize(MAX_TAGS_IN_REQUEST)
  @IsUUID('all', { each: true })
  tag?: string[];

  @IsOptional()
  @Matches(CURSOR)
  cursor?: string;
}

export class TrashQueryDto {
  @IsOptional()
  @Matches(CURSOR)
  cursor?: string;
}

/** TRASH-11 */
export class EmptyTrashDto {
  @IsInt()
  @Min(0)
  expectedCount!: number;
}

/** TAG-15 */
export class RenameTagDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  confirmMerge?: boolean;
}
