import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type { IsoDateTime } from '@/types/api';
import type { DateOnly, TimeOfDay } from '@/types/models';

dayjs.extend(customParseFormat);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

/*
 * Date formatting for display. Timestamps from the API are UTC; these show them in the
 * browser's local time.
 */

/** "Oct 26, 2026" */
export function formatDate(value: IsoDateTime): string {
  return dayjs(value).format('ll');
}

/** "Oct 26, 2026 9:30 AM" */
export function formatDateTime(value: IsoDateTime): string {
  return dayjs(value).format('lll');
}

/** "3 hours ago", "in 5 days" */
export function formatRelative(value: IsoDateTime): string {
  return dayjs(value).fromNow();
}

// --- Calendar dates ("2026-12-25") and times of day ("09:30") --------------------------------
// These have no time zone; dayjs parses them as local, which is what display needs.

/** Today as "YYYY-MM-DD" in the browser's time zone, e.g. for a date input's default. */
export function todayDateOnly(): DateOnly {
  return dayjs().format('YYYY-MM-DD');
}

/** "Dec 25, 2026", or "Dec 24, 2026 – Dec 26, 2026" for a range. */
export function formatDateRange(startsOn: DateOnly, endsOn: DateOnly): string {
  const start = dayjs(startsOn).format('ll');
  return startsOn === endsOn ? start : `${start} – ${dayjs(endsOn).format('ll')}`;
}

/** Days in an inclusive range: Dec 24 – Dec 26 is 3. */
export function countDays(startsOn: DateOnly, endsOn: DateOnly): number {
  return dayjs(endsOn).diff(dayjs(startsOn), 'day') + 1;
}

/** "09:30" → "9:30 AM" (in the browser's locale). */
export function formatTimeOfDay(value: TimeOfDay): string {
  return dayjs(`2000-01-01T${value}`).format('LT');
}

/** "09:30" → 570; handy for comparing times. */
export function timeOfDayToMinutes(value: TimeOfDay): number {
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

// --- In a business's time zone (appointments) ------------------------------------------------
// Appointments are shown in the business's time zone, not the browser's: someone looking at
// the schedule from another city still sees the times the business works in.

/** Today as "YYYY-MM-DD" in a time zone. */
export function todayInTimeZone(timeZone: string): DateOnly {
  return dayjs().tz(timeZone).format('YYYY-MM-DD');
}

/** "2026-12-24" plus n days (n may be negative). */
export function addDaysToDate(date: DateOnly, days: number): DateOnly {
  return dayjs(date).add(days, 'day').format('YYYY-MM-DD');
}

/** The Monday-to-Sunday week containing `date`, as seven "YYYY-MM-DD" dates. */
export function weekOf(date: DateOnly): DateOnly[] {
  const day = dayjs(date);
  const monday = day.subtract((day.day() + 6) % 7, 'day');
  return Array.from({ length: 7 }, (_, index) => monday.add(index, 'day').format('YYYY-MM-DD'));
}

/** Parts of a date for compact display: { weekday: "Mon", day: "28", month: "Dec" }. */
export function dateParts(date: DateOnly): { weekday: string; day: string; month: string } {
  const value = dayjs(date);
  return { weekday: value.format('ddd'), day: value.format('D'), month: value.format('MMM') };
}

/** "December 2026" */
export function formatMonthYear(date: DateOnly): string {
  return dayjs(date).format('MMMM YYYY');
}

/** "Thursday, Dec 24, 2026" */
export function formatLongDate(date: DateOnly): string {
  return dayjs(date).format('dddd, ll');
}

/** "Thu, Dec 24" */
export function formatShortDate(date: DateOnly): string {
  return dayjs(date).format('ddd, MMM D');
}

/** An instant's time of day in a time zone: "9:30 AM". */
export function formatTimeInZone(value: IsoDateTime, timeZone: string): string {
  return dayjs(value).tz(timeZone).format('LT');
}

/** An instant's calendar date in a time zone: "2026-12-24". */
export function dateInZone(value: IsoDateTime, timeZone: string): DateOnly {
  return dayjs(value).tz(timeZone).format('YYYY-MM-DD');
}

/** "2026-12-24" + "09:30" in a time zone → the ISO instant, e.g. for booking a typed time. */
export function zonedDateTimeToIso(date: DateOnly, time: TimeOfDay, timeZone: string): IsoDateTime {
  return dayjs.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', timeZone).toISOString();
}

/** True when the instant has already passed. */
export function isPast(value: IsoDateTime): boolean {
  return dayjs(value).isBefore(dayjs());
}

/** Morning before 12:00, afternoon before 17:00, evening after. */
export function greetingForNow(): string {
  const hour = dayjs().hour();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
