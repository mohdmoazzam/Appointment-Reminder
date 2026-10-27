import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { appointment_status } from '../database/prisma/generated/client.js';
import { IsDateOnly } from '../decorators/date-time.decorators.js';
import { PageOptionsDto } from './common.dto.js';
import { CustomerInputDto } from './customers.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Query strings arrive as text: "true"/"false" -> boolean. */
const toBoolean = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);

// --- Availability --------------------------------------------------------------------------------

/** Paginated like every list (order applies to start time); take=100 covers a whole day. */
export class AvailabilityQueryDto extends PageOptionsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  service_id: string;

  @ApiProperty({ example: '2026-12-24', description: "A day in the business's time zone" })
  @IsDateOnly()
  date: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Only this staff member; any who offers the service if omitted' })
  @IsOptional()
  @IsUUID()
  staff_id?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: "Treat this appointment's time as free, e.g. when rescheduling it",
  })
  @IsOptional()
  @IsUUID()
  ignore_appointment_id?: string;
}

// --- Booking from the dashboard ------------------------------------------------------------------

export class CreateAppointmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  service_id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  staff_id: string;

  @ApiProperty({ example: '2026-12-24T04:30:00.000Z', description: 'Start, ISO 8601 with an offset or Z' })
  @IsISO8601({ strict: true })
  starts_at: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'An existing customer. Give either this or `customer`.' })
  @ValidateIf((o: CreateAppointmentDto) => o.customer === undefined)
  @IsUUID()
  customer_id?: string;

  @ApiPropertyOptional({
    type: CustomerInputDto,
    description: 'A new or returning customer, matched by phone. Give either this or `customer_id`.',
  })
  @ValidateIf((o: CreateAppointmentDto) => o.customer_id === undefined)
  @ValidateNested()
  @Type(() => CustomerInputDto)
  customer?: CustomerInputDto;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @ApiPropertyOptional({
    default: false,
    description:
      'Allow a time outside working hours, on a closure or during time off (e.g. a walk-in). Overlapping appointments are still refused.',
  })
  @IsOptional()
  @IsBoolean()
  ignore_schedule?: boolean;
}

export class RescheduleAppointmentDto {
  @ApiProperty({ example: '2026-12-24T05:00:00.000Z' })
  @IsISO8601({ strict: true })
  starts_at: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Move to another staff member who offers the service' })
  @IsOptional()
  @IsUUID()
  staff_id?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  ignore_schedule?: boolean;
}

/** Statuses a client may set; "booked" is only the starting state. */
export const SETTABLE_STATUSES = [
  appointment_status.confirmed,
  appointment_status.completed,
  appointment_status.cancelled,
  appointment_status.no_show,
] as const;

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: SETTABLE_STATUSES })
  @IsEnum(SETTABLE_STATUSES)
  status: (typeof SETTABLE_STATUSES)[number];

  @ApiPropertyOptional({ description: 'Only for status "cancelled"' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  cancellation_reason?: string;
}

export class ListAppointmentsDto extends PageOptionsDto {
  @ApiPropertyOptional({ example: '2026-12-24', description: "First day (business's time zone), inclusive" })
  @IsOptional()
  @IsDateOnly()
  date_from?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Last day, inclusive' })
  @IsOptional()
  @IsDateOnly()
  date_to?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  staff_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @ApiPropertyOptional({ enum: appointment_status })
  @IsOptional()
  @IsEnum(appointment_status)
  status?: appointment_status;

  @ApiPropertyOptional({ description: 'Leave out cancelled appointments' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  exclude_cancelled?: boolean;
}
