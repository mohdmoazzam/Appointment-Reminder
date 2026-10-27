import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO31661Alpha2,
  IsISO4217CurrencyCode,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { business_type } from '../database/prisma/generated/client.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

/**
 * Partial update. Required columns (name, type, timezone) may be omitted but not nulled;
 * optional columns accept `null` to clear them.
 */
export class UpdateBusinessDto {
  @ApiPropertyOptional({ example: 'Glow Salon & Spa' })
  @ValidateIf((o: UpdateBusinessDto) => o.name !== undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: business_type })
  @ValidateIf((o: UpdateBusinessDto) => o.type !== undefined)
  @IsEnum(business_type)
  type?: business_type;

  @ApiPropertyOptional({ example: 'Asia/Kolkata', description: 'IANA time zone' })
  @ValidateIf((o: UpdateBusinessDto) => o.timezone !== undefined)
  @IsTimeZone()
  timezone?: string;

  @ApiPropertyOptional({ example: 'INR', description: 'ISO 4217 currency for service prices' })
  @ValidateIf((o: UpdateBusinessDto) => o.currency !== undefined)
  @Transform(upper)
  @IsISO4217CurrencyCode()
  currency?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210', nullable: true })
  @IsOptional()
  @Matches(/^\+?[0-9 ()-]{7,20}$/, { message: 'phone must be a valid phone number' })
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  address_line1?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  address_line2?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  state?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  postal_code?: string | null;

  @ApiPropertyOptional({ example: 'IN', description: 'ISO 3166-1 alpha-2', nullable: true })
  @IsOptional()
  @Transform(upper)
  @IsISO31661Alpha2()
  country?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Image uploaded via POST /assets/upload; null removes the logo',
  })
  @IsOptional()
  @IsUUID()
  logo_asset_id?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Wide image uploaded via POST /assets/upload, shown on the booking page; null removes it',
  })
  @IsOptional()
  @IsUUID()
  cover_asset_id?: string | null;
}
