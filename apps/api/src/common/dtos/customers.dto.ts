import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PageOptionsDto } from './common.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const normalizeEmail = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() || undefined : value);

/** Same rule as business phone numbers; stored normalised (see Helper.normalizePhone). */
const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

/** A customer as entered when booking; an existing customer with the same phone is reused. */
export class CustomerInputDto {
  @ApiProperty({ example: 'Priya' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name: string;

  @ApiProperty({ example: 'Sharma' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name: string;

  @ApiProperty({ example: '+91 98765 43210', description: 'WhatsApp number, with country code' })
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  phone: string;

  @ApiPropertyOptional({ example: 'priya@example.com' })
  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email?: string;
}

export class ListCustomersDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Matches first name, last name or phone' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}
