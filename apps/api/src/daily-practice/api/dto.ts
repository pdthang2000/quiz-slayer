import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// Request shapes only. Business rules (DP-12 limits, kinds) live in the domain.

export class AddTrackDto {
  @IsString()
  @MaxLength(200)
  tagName!: string;
}

export class TrackSettingsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  kinds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dailySize?: number;
}

export class AnswerDto {
  /** One choice index per question of the quiz (a group answers all at once, G-7). */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  choices!: number[];
}
