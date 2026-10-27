import type { TimeOfDay, WorkingHoursInterval } from '@/types/models';
import type { WorkingHoursIntervalInput } from './types';

/*
 * A working day is a list of sessions: the times someone actually sits, e.g. a doctor who sees
 * patients 10:00–14:00 and again 16:00–18:00. The gaps between sessions are breaks and can't be
 * booked. Sessions map one-to-one to the API's working-hours intervals.
 */

export interface SessionFormValues {
  start_time: TimeOfDay;
  end_time: TimeOfDay;
}

export interface DayFormValues {
  /** 0 = Sunday … 6 = Saturday */
  day_of_week: number;
  is_working: boolean;
  /**
   * Never empty: a day off keeps one session so that switching the day back on shows sensible
   * times. Sessions of a day off are ignored when saving.
   */
  sessions: SessionFormValues[];
}

export interface WeeklyScheduleFormValues {
  days: DayFormValues[];
}

/** Same limit as the API (MAX_INTERVALS_PER_DAY). */
export const MAX_SESSIONS_PER_DAY = 6;

/** Monday first, the way most businesses read their week. */
export const DAYS_IN_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** What a day starts with when it is switched on for the first time. */
export function defaultSession(): SessionFormValues {
  return { start_time: '09:00', end_time: '17:00' };
}

/** Sessions in time order; sessions are typed in any order but saved and shown sorted. */
export function sortSessions(sessions: readonly SessionFormValues[]): SessionFormValues[] {
  return [...sessions].sort((a, b) => a.start_time.localeCompare(b.start_time));
}

/** API intervals → one entry per day, in display order. Days without intervals are days off. */
export function toWeeklyScheduleFormValues(
  intervals: WorkingHoursInterval[],
): WeeklyScheduleFormValues {
  return {
    days: DAYS_IN_DISPLAY_ORDER.map((dayOfWeek) => {
      const sessions = sortSessions(
        intervals
          .filter((interval) => interval.day_of_week === dayOfWeek)
          .map(({ start_time, end_time }) => ({ start_time, end_time })),
      );
      return sessions.length > 0
        ? { day_of_week: dayOfWeek, is_working: true, sessions }
        : { day_of_week: dayOfWeek, is_working: false, sessions: [defaultSession()] };
    }),
  };
}

/** Form → API intervals (working days only, sessions in time order). Expects validated values. */
export function toWorkingHoursIntervals(
  values: WeeklyScheduleFormValues,
): WorkingHoursIntervalInput[] {
  return values.days
    .filter((day) => day.is_working)
    .flatMap((day) =>
      sortSessions(day.sessions).map((session) => ({
        day_of_week: day.day_of_week,
        start_time: session.start_time,
        end_time: session.end_time,
      })),
    );
}

/** The same values with every day's sessions sorted, e.g. to show after saving. */
export function withSortedSessions(values: WeeklyScheduleFormValues): WeeklyScheduleFormValues {
  return { days: values.days.map((day) => ({ ...day, sessions: sortSessions(day.sessions) })) };
}

export interface DaySummary {
  /** Total minutes in sessions. */
  workingMinutes: number;
  /** Gaps between consecutive sessions. */
  breaks: SessionFormValues[];
}

/**
 * Totals for display while editing. Sessions that are incomplete or end before they start are
 * skipped (validation reports those), so the summary never shows nonsense.
 */
export function summarizeDay(sessions: readonly SessionFormValues[]): DaySummary {
  const valid = sortSessions(sessions).filter(
    (session) =>
      isTimeOfDay(session.start_time) &&
      isTimeOfDay(session.end_time) &&
      session.end_time > session.start_time,
  );

  const workingMinutes = valid.reduce((total, session) => total + sessionMinutes(session), 0);
  const breaks: SessionFormValues[] = [];
  for (let index = 1; index < valid.length; index++) {
    const previousEnd = valid[index - 1]!.end_time;
    const nextStart = valid[index]!.start_time;
    // Touching sessions (14:00–14:00) have no break between them; overlaps are a validation error.
    if (previousEnd < nextStart) breaks.push({ start_time: previousEnd, end_time: nextStart });
  }
  return { workingMinutes, breaks };
}

/** Length of a session in minutes. */
export function sessionMinutes(session: SessionFormValues): number {
  return toMinutes(session.end_time) - toMinutes(session.start_time);
}

// This module has no app imports (only types), so its logic can be checked in isolation.

const TIME_OF_DAY = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isTimeOfDay(value: string): boolean {
  return TIME_OF_DAY.test(value);
}

/** "09:30" → 570 */
function toMinutes(value: TimeOfDay): number {
  const match = TIME_OF_DAY.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

// --- Templates and totals ------------------------------------------------------------------------

export interface ScheduleTemplate {
  id: string;
  label: string;
  description: string;
  /** Sessions per working day; days not listed are days off. */
  workingDays: readonly number[];
  sessions: readonly SessionFormValues[];
}

const MONDAY_TO_FRIDAY = [1, 2, 3, 4, 5];
const MONDAY_TO_SATURDAY = [1, 2, 3, 4, 5, 6];

/** Common weeks to start from; the user adjusts afterwards. */
export const SCHEDULE_TEMPLATES: readonly ScheduleTemplate[] = [
  {
    id: 'office',
    label: 'Mon–Fri, 9 AM – 5 PM',
    description: 'A standard working week',
    workingDays: MONDAY_TO_FRIDAY,
    sessions: [{ start_time: '09:00', end_time: '17:00' }],
  },
  {
    id: 'retail',
    label: 'Mon–Sat, 10 AM – 7 PM',
    description: 'Salons and shops',
    workingDays: MONDAY_TO_SATURDAY,
    sessions: [{ start_time: '10:00', end_time: '19:00' }],
  },
  {
    id: 'split',
    label: 'Mon–Sat, 10–2 and 4–6',
    description: 'Clinics with an afternoon break',
    workingDays: MONDAY_TO_SATURDAY,
    sessions: [
      { start_time: '10:00', end_time: '14:00' },
      { start_time: '16:00', end_time: '18:00' },
    ],
  },
];

/** The whole week set from a template (days in display order). */
export function applyTemplate(template: ScheduleTemplate): WeeklyScheduleFormValues {
  return {
    days: DAYS_IN_DISPLAY_ORDER.map((dayOfWeek) =>
      template.workingDays.includes(dayOfWeek)
        ? {
            day_of_week: dayOfWeek,
            is_working: true,
            sessions: template.sessions.map((s) => ({ ...s })),
          }
        : { day_of_week: dayOfWeek, is_working: false, sessions: [defaultSession()] },
    ),
  };
}

/** Indexes (display order) of Monday to Friday. */
export const WEEKDAY_INDEXES = [0, 1, 2, 3, 4] as const;

/** Total hours and working days, from the valid sessions of working days. */
export function summarizeWeek(days: readonly DayFormValues[]): {
  minutes: number;
  workingDays: number;
} {
  const working = days.filter((day) => day.is_working);
  return {
    minutes: working.reduce((total, day) => total + summarizeDay(day.sessions).workingMinutes, 0),
    workingDays: working.length,
  };
}
