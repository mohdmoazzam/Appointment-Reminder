import type { PageQuery } from '@/types/api';
import type { DateOnly, TimeOfDay } from '@/types/models';

/** One interval in PUT /staff/:user_id/working-hours (WorkingHoursIntervalDto). */
export interface WorkingHoursIntervalInput {
  /** 0 = Sunday … 6 = Saturday */
  day_of_week: number;
  start_time: TimeOfDay;
  end_time: TimeOfDay;
}

/** PUT /staff/:user_id/working-hours (SetWorkingHoursDto): replaces the whole week. */
export interface SetWorkingHoursRequest {
  intervals: WorkingHoursIntervalInput[];
}

/** GET time off / closures (ListDateRangesDto). */
export interface DateRangesQuery extends PageQuery {
  /** Only ranges ending on or after this date; the API defaults to today for the business. */
  from?: DateOnly;
}

/** POST /staff/:user_id/time-off (CreateTimeOffDto) */
export interface CreateTimeOffRequest {
  starts_on: DateOnly;
  /** Inclusive. */
  ends_on: DateOnly;
  reason?: string | null;
}

/** POST /closures (CreateClosureDto) */
export interface CreateClosureRequest {
  name: string;
  starts_on: DateOnly;
  /** Inclusive. */
  ends_on: DateOnly;
}

/** PATCH /closures/:id (UpdateClosureDto) */
export type UpdateClosureRequest = Partial<CreateClosureRequest>;
