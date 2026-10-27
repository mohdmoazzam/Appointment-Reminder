import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PageOptionsDto } from './common.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Query strings arrive as text: "true"/"false" -> boolean. */
const toBoolean = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);

export const SERVICE_MIN_MINUTES = 5;
export const SERVICE_MAX_MINUTES = 720;
const MAX_PRICE = 99_999_999.99;
const MAX_STAFF_PER_SERVICE = 200;

export class ListServicesDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Only active (true) or only inactive (false) services' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  is_active?: boolean;
}

export class CreateServiceDto {
  @ApiProperty({ example: 'Haircut' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Wash, cut and blow-dry', nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiProperty({ example: 30, minimum: SERVICE_MIN_MINUTES, maximum: SERVICE_MAX_MINUTES })
  @IsInt()
  @Min(SERVICE_MIN_MINUTES)
  @Max(SERVICE_MAX_MINUTES)
  duration_minutes: number;

  @ApiProperty({ example: 450, description: "In the business's currency, up to 2 decimal places" })
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_PRICE)
  price: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [String], format: 'uuid', description: 'Staff members who offer this service' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_STAFF_PER_SERVICE)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  staff_ids?: string[];
}

/**
 * Partial update. name, duration_minutes, price and is_active may be omitted but not nulled;
 * description accepts null to clear it. staff_ids, when sent, replaces the whole list.
 */
export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'Haircut & styling' })
  @ValidateIf((o: UpdateServiceDto) => o.name !== undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({ minimum: SERVICE_MIN_MINUTES, maximum: SERVICE_MAX_MINUTES })
  @ValidateIf((o: UpdateServiceDto) => o.duration_minutes !== undefined)
  @IsInt()
  @Min(SERVICE_MIN_MINUTES)
  @Max(SERVICE_MAX_MINUTES)
  duration_minutes?: number;

  @ApiPropertyOptional()
  @ValidateIf((o: UpdateServiceDto) => o.price !== undefined)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_PRICE)
  price?: number;

  @ApiPropertyOptional()
  @ValidateIf((o: UpdateServiceDto) => o.is_active !== undefined)
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_STAFF_PER_SERVICE)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  staff_ids?: string[];
}
