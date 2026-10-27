import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { business_type } from '../database/prisma/generated/client.js';

const normalizeEmail = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SignupBusinessDto {
  @ApiProperty({ example: 'Glow Salon' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: business_type, example: business_type.salon })
  @IsEnum(business_type)
  type: business_type;

  @ApiProperty({ example: 'Asia/Kolkata', description: 'IANA time zone' })
  @IsTimeZone()
  timezone: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsOptional()
  @Matches(/^\+?[0-9 ()-]{7,20}$/, { message: 'phone must be a valid phone number' })
  phone?: string;
}

export class SignupOwnerDto {
  @ApiProperty({ example: 'Aisha' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name: string;

  @ApiProperty({ example: 'Khan' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name: string;

  @ApiProperty({ example: 'owner@glowsalon.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class SignupDto {
  @ApiProperty({ type: SignupBusinessDto })
  @ValidateNested()
  @Type(() => SignupBusinessDto)
  business: SignupBusinessDto;

  @ApiProperty({ type: SignupOwnerDto })
  @ValidateNested()
  @Type(() => SignupOwnerDto)
  owner: SignupOwnerDto;
}

export class LoginDto {
  @ApiProperty({ example: 'owner@glowsalon.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  refresh_token: string;
}

export class AcceptInviteDto {
  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ description: 'Overrides the first name the owner entered on the invite' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name?: string;

  @ApiPropertyOptional({ description: 'Overrides the last name the owner entered on the invite' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name?: string;
}
