import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import { Prisma } from './database/prisma/generated/client.js';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

/** Calendar dates in the API: "2026-12-25". */
const DATE_ONLY_FORMAT = 'YYYY-MM-DD';
/** Times of day in the API: "09:30" (24-hour). */
const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Shared helpers. All date handling goes through here (backed by Day.js); don't use `new Date()` directly. */
export class Helper {
  /** The current moment, as a Date for Prisma. */
  static getCurrentTimestamp(): Date {
    return dayjs().toDate();
  }

  /** `days` days after `from` (default: now). */
  static addDays(days: number, from: Date = Helper.getCurrentTimestamp()): Date {
    return dayjs(from).add(days, 'day').toDate();
  }

  /** A JWT timestamp (seconds since the epoch, e.g. the `exp` claim) as a Date. */
  static fromUnixSeconds(seconds: number): Date {
    return dayjs.unix(seconds).toDate();
  }

  /** Milliseconds from now until `date`; 0 when it has passed. */
  static msUntil(date: Date): number {
    return Math.max(0, dayjs(date).diff(dayjs()));
  }

  /** True when `date` is now or in the past, e.g. an expiry timestamp that has passed. */
  static isExpired(date: Date): boolean {
    return !dayjs(date).isAfter(dayjs());
  }

  // --- Calendar dates (Postgres DATE columns) --------------------------------------------------
  // Prisma reads and writes DATE columns as Dates at UTC midnight, so these work in UTC to keep
  // "2026-12-25" from shifting a day in other server time zones.

  /** True for a real calendar date in "YYYY-MM-DD" form ("2026-02-30" is false). */
  static isValidDateOnly(value: string): boolean {
    return dayjs.utc(value, DATE_ONLY_FORMAT, true).isValid();
  }

  /** "2026-12-25" -> Date at 2026-12-25T00:00:00Z, for a DATE column. */
  static parseDateOnly(value: string): Date {
    return dayjs.utc(value, DATE_ONLY_FORMAT, true).toDate();
  }

  /** A DATE column's value -> "2026-12-25". */
  static formatDateOnly(date: Date): string {
    return dayjs.utc(date).format(DATE_ONLY_FORMAT);
  }

  /** Today's calendar date in an IANA time zone, e.g. the business's: "2026-12-25". */
  static todayInTimeZone(timeZone: string): string {
    return dayjs().tz(timeZone).format(DATE_ONLY_FORMAT);
  }

  /** Whole days from `start` to `end` ("2026-12-24" -> "2026-12-26" is 2). */
  static daysBetween(start: string, end: string): number {
    return dayjs.utc(end, DATE_ONLY_FORMAT, true).diff(dayjs.utc(start, DATE_ONLY_FORMAT, true), 'day');
  }

  // --- Times of day (working hours) ------------------------------------------------------------

  /** True for "HH:mm" between "00:00" and "23:59". */
  static isValidTimeOfDay(value: string): boolean {
    return TIME_OF_DAY_PATTERN.test(value);
  }

  /** "09:30" -> 570 (minutes after midnight). */
  static timeOfDayToMinutes(value: string): number {
    const match = TIME_OF_DAY_PATTERN.exec(value);
    if (!match) throw new Error(`Invalid time of day: ${value}`);
    return Number(match[1]) * 60 + Number(match[2]);
  }

  /** 570 -> "09:30" */
  static minutesToTimeOfDay(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }

  // --- Instants in a business's time zone (appointments) -----------------------------------------

  /** "2026-12-24" + 600 minutes in "Asia/Kolkata" -> the instant 2026-12-24 10:00 IST. */
  static zonedDateTime(date: string, minutesAfterMidnight: number, timeZone: string): Date {
    const time = Helper.minutesToTimeOfDay(minutesAfterMidnight);
    return dayjs.tz(`${date} ${time}`, `${DATE_ONLY_FORMAT} HH:mm`, timeZone).toDate();
  }

  /** The instants where a calendar day starts and the next one starts, in a time zone. */
  static zonedDayBounds(date: string, timeZone: string): { start: Date; end: Date } {
    const start = dayjs.tz(date, DATE_ONLY_FORMAT, timeZone);
    return { start: start.toDate(), end: start.add(1, 'day').toDate() };
  }

  /** An instant as a local calendar date and minutes after midnight in a time zone. */
  static toZonedDateAndMinutes(instant: Date, timeZone: string): { date: string; minutes: number } {
    const local = dayjs(instant).tz(timeZone);
    return { date: local.format(DATE_ONLY_FORMAT), minutes: local.hour() * 60 + local.minute() };
  }

  /** "2026-12-24" -> 4 (0 = Sunday … 6 = Saturday). A calendar date has the same weekday everywhere. */
  static dayOfWeek(date: string): number {
    return dayjs.utc(date, DATE_ONLY_FORMAT, true).day();
  }

  /** `date` plus `days` calendar days, both "YYYY-MM-DD". */
  static addDaysToDateOnly(date: string, days: number): string {
    return dayjs.utc(date, DATE_ONLY_FORMAT, true).add(days, 'day').format(DATE_ONLY_FORMAT);
  }

  static addMinutes(instant: Date, minutes: number): Date {
    return dayjs(instant).add(minutes, 'minute').toDate();
  }

  /** True when `instant` is strictly before now. */
  static isPast(instant: Date): boolean {
    return dayjs(instant).isBefore(dayjs());
  }

  /** Parses an ISO 8601 timestamp sent by a client (validated by the DTO). */
  static parseInstant(value: string): Date {
    return dayjs(value).toDate();
  }

  // --- Phone numbers -----------------------------------------------------------------------------

  /**
   * Canonical form used to recognise returning customers: digits only, keeping a leading "+".
   * "+91 98765-43210" and "+919876543210" are the same customer.
   */
  static normalizePhone(value: string): string {
    const trimmed = value.trim();
    const digits = trimmed.replace(/\D/g, '');
    return trimmed.startsWith('+') ? `+${digits}` : digits;
  }

  // --- Database errors ---------------------------------------------------------------------------

  /** True when Prisma rejected a write because of a unique constraint (P2002). */
  static isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  /** True when a delete or update was blocked by a foreign key (P2003), e.g. rows still refer to it. */
  static isForeignKeyViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
  }

  /**
   * True when Postgres refused a write because of the named constraint. Used for constraints
   * Prisma doesn't model (e.g. an exclusion constraint, SQLSTATE 23P01), whose details only
   * appear in the error's message, meta or cause depending on the driver adapter.
   */
  static isConstraintViolation(error: unknown, constraintName: string): boolean {
    const MAX_DEPTH = 6;
    const seen = new Set<object>();
    const mentionsConstraint = (value: unknown, depth: number): boolean => {
      if (typeof value === 'string') return value.includes(constraintName);
      if (value === null || typeof value !== 'object' || depth > MAX_DEPTH || seen.has(value)) return false;
      seen.add(value);
      const record = value as Record<string, unknown>;
      // Error's message and cause are non-enumerable, so read them explicitly.
      const values = [record['message'], record['cause'], ...Object.values(record)];
      return values.some((nested) => mentionsConstraint(nested, depth + 1));
    };
    return mentionsConstraint(error, 0);
  }

  /** "Glow Salon & Spa" -> "glow-salon-spa" */
  static slugify(value: string): string {
    const slug = value
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
    return slug || 'business';
  }

  /** A caught value as text, for logs and stored error messages. */
  static errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /** An instant in a time zone, e.g. "Mon, Nov 2 at 10:30 AM". */
  static formatInZone(instant: Date, timeZone: string): string {
    return dayjs(instant).tz(timeZone).format('ddd, MMM D [at] h:mm A');
  }
}
