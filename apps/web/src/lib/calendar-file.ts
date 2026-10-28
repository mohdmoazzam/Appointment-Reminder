import type { IsoDateTime } from '@/types/api';

export interface CalendarEvent {
  /** Stable id, so re-importing the same booking updates instead of duplicating it. */
  uid: string;
  title: string;
  starts_at: IsoDateTime;
  ends_at: IsoDateTime;
  description?: string;
  location?: string;
}

/**
 * An iCalendar (.ics, RFC 5545) file with one event, which Google Calendar, Apple Calendar and
 * Outlook can all import. Times are written in UTC, so the calendar shows them in the user's
 * own time zone.
 */
export function buildCalendarFile(event: CalendarEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ShowUp//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeText(event.uid)}@appointment-reminder`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${toIcsUtc(event.starts_at)}`,
    `DTEND:${toIcsUtc(event.ends_at)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  // RFC 5545 requires CRLF line endings.
  return lines.join('\r\n') + '\r\n';
}

/** Saves text as a file through the browser's download. */
export function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** "2026-12-28T04:30:00.000Z" → "20261228T043000Z" */
function toIcsUtc(value: IsoDateTime): string {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** Escapes the characters iCalendar treats specially in text values. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/([,;])/g, '\\$1');
}
