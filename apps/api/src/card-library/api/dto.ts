import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// Request shape only. Business rules (lengths, tag names, limits) live in the domain.

/**
 * Shape guard against oversized requests, not a business rule: the 20-tag limit
 * (CARDTAG-03) stays in the domain, because duplicates count once (CARDTAG-06).
 */
const MAX_TAGS_IN_REQUEST = 100;

/** CARDTAG-07, CARDTAG-08: shape guard, also capped by the app (ADR-011). */
const MAX_CARDS_PER_TAG_ACTION = 100;

/** STUDY-02: card content is fetched 20 at a time. */
const MAX_IDS_PER_BATCH = 20;

const toArray = ({ value }: { value: unknown }): unknown[] =>
  Array.isArray(value) ? (value as unknown[]) : [value];

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

export class ListCardsQueryDto {
  /** READ-03 */
  @IsOptional()
  @IsString()
  q?: string;

  /** READ-05: ?tag=<id>&tag=<id> */
  @IsOptional()
  @Transform(toArray)
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

/** TRASH-11: the count and the newest "trashed at" the dialog showed (null: empty Trash). */
export class EmptyTrashDto {
  @IsInt()
  @Min(0)
  expectedCount!: number;

  @ValidateIf((o: EmptyTrashDto) => o.newestTrashedAt !== null)
  @IsISO8601({ strict: true })
  newestTrashedAt!: string | null;
}

/** TAG-15, TAG-16 */
export class RenameTagDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  confirmMerge?: boolean;
}

export class CardVersionDto {
  @IsUUID()
  cardId!: string;

  @IsInt()
  @Min(0)
  version!: number;
}

/** CARDTAG-07, CARDTAG-08. The tag's version goes in If-Match (TAG-16, C-46). */
export class TagCardsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_CARDS_PER_TAG_ACTION)
  @ValidateNested({ each: true })
  @Type(() => CardVersionDto)
  cards!: CardVersionDto[];
}

/** CARDTAG-08 picker */
export class TagPickerQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Matches(CURSOR)
  cursor?: string;
}

/** STUDY-01: the card list's filter. */
export class StudyIdsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(toArray)
  @ArrayMaxSize(MAX_TAGS_IN_REQUEST)
  @IsUUID('all', { each: true })
  tag?: string[];
}

/** STUDY-02: ?id=<id>&id=<id>, at most 20. */
export class CardIdsQueryDto {
  @Transform(toArray)
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_IDS_PER_BATCH)
  @IsUUID('all', { each: true })
  id!: string[];
}
