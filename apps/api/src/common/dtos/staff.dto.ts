import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { user_role, user_status } from '../database/prisma/generated/client.js';

export class CreateInviteDto {
  @ApiProperty({ example: 'stylist@glowsalon.com' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'Rahul' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name: string;

  @ApiProperty({ example: 'Verma' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name: string;

  @ApiPropertyOptional({ enum: user_role, default: user_role.staff })
  @IsOptional()
  @IsEnum(user_role)
  role?: user_role;
}

/** Replaces the set of services a staff member offers. */
export class SetStaffServicesDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  service_ids: string[];
}

export class UpdateStaffDto {
  @ApiPropertyOptional({ enum: user_role })
  @IsOptional()
  @IsEnum(user_role)
  role?: user_role;

  @ApiPropertyOptional({ enum: user_status })
  @IsOptional()
  @IsEnum(user_status)
  status?: user_status;
}
