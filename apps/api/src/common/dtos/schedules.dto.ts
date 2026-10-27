import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsDateOnly, IsTimeOfDay } from '../decorators/date-time.decorators.js';
import { PageOptionsDto } from './common.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** At most 6 intervals (5 breaks) on each of the 7 days. */
export const MAX_INTERVALS_PER_DAY = 6;
/** Time off and closures can't span more than this many days. */
export const MAX_DATE_RANGE_DAYS = 366;

// --- Working hours -------------------------------------------------------------------------------

export class WorkingHoursIntervalDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: '0 = Sunday … 6 = Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week: number;

  @ApiProperty({ example: '09:00', description: "HH:mm in the business's time zone" })
  @IsTimeOfDay()
  start_time: string;

  @ApiProperty({ example: '13:00', description: 'HH:mm, after start_time' })
  @IsTimeOfDay()
  end_time: string;
}

/** Replaces a staff member's whole weekly schedule. Gaps between intervals on a day are breaks. */
export class SetWorkingHoursDto {
  @ApiProperty({ type: [WorkingHoursIntervalDto] })
  @IsArray()
  @ArrayMaxSize(MAX_INTERVALS_PER_DAY * 7)
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursIntervalDto)
  intervals: WorkingHoursIntervalDto[];
}

// --- Date ranges (time off, closures) ------------------------------------------------------------

export class ListDateRangesDto extends PageOptionsDto {
  @ApiPropertyOptional({
    example: '2026-12-01',
    description: "Only ranges ending on or after this date. Defaults to today in the business's time zone.",
  })
  @IsOptional()
  @IsDateOnly()
  from?: string;
}

export class CreateTimeOffDto {
  @ApiProperty({ example: '2026-12-24', description: 'First day off (YYYY-MM-DD)' })
  @IsDateOnly()
  starts_on: string;

  @ApiProperty({ example: '2026-12-26', description: 'Last day off, inclusive (YYYY-MM-DD)' })
  @IsDateOnly()
  ends_on: string;

  @ApiPropertyOptional({ example: 'Family wedding', nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  reason?: string | null;
}

export class CreateClosureDto {
  @ApiProperty({ example: 'Diwali' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '2026-11-08', description: 'First closed day (YYYY-MM-DD)' })
  @IsDateOnly()
  starts_on: string;

  @ApiProperty({ example: '2026-11-09', description: 'Last closed day, inclusive (YYYY-MM-DD)' })
  @IsDateOnly()
  ends_on: string;
}

/** Partial update; fields may be omitted but not nulled. */
export class UpdateClosureDto {
  @ApiPropertyOptional()
  @ValidateIf((o: UpdateClosureDto) => o.name !== undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: UpdateClosureDto) => o.starts_on !== undefined)
  @IsDateOnly()
  starts_on?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: UpdateClosureDto) => o.ends_on !== undefined)
  @IsDateOnly()
  ends_on?: string;
}
