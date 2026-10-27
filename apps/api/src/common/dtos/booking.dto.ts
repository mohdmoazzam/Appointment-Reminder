import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { IsDateOnly } from '../decorators/date-time.decorators.js';
import { PageOptionsDto } from './common.dto.js';
import { CustomerInputDto } from './customers.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** GET /public/businesses/:slug/availability; paginated like every list (take=100 covers a day). */
export class PublicAvailabilityQueryDto extends PageOptionsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  service_id: string;

  @ApiProperty({ example: '2026-12-24', description: "A day in the business's time zone" })
  @IsDateOnly()
  date: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'A preferred staff member; anyone available if omitted' })
  @IsOptional()
  @IsUUID()
  staff_id?: string;
}

/** POST /public/businesses/:slug/appointments: a customer booking online. */
export class PublicBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  service_id: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Anyone available at that time if omitted' })
  @IsOptional()
  @IsUUID()
  staff_id?: string;

  @ApiProperty({ example: '2026-12-24T04:30:00.000Z', description: 'One of the available slot starts' })
  @IsISO8601({ strict: true })
  starts_at: string;

  @ApiProperty({ type: CustomerInputDto })
  @ValidateNested()
  @Type(() => CustomerInputDto)
  customer: CustomerInputDto;

  @ApiPropertyOptional({ description: 'Anything the business should know' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
