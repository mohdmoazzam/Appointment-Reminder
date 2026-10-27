import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { buildCalendarFile, downloadTextFile } from '@/lib/calendar-file';
import { dateInZone, dateParts, formatLongDate, formatTimeInZone } from '@/lib/date';
import { formatDuration } from '@/lib/durations';
import { formatPrice } from '@/lib/money';
import type { BookingConfirmation as Confirmation, PublicBusiness } from '../types';

interface BookingConfirmationProps {
  confirmation: Confirmation;
  business: PublicBusiness;
  onBookAnother: () => void;
}

/** The end of the booking: what was booked, add to calendar, and how to change it. */
export function BookingConfirmation({ confirmation, business, onBookAnother }: BookingConfirmationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timeZone = business.timezone;
  const date = dateInZone(confirmation.starts_at, timeZone);
  const { weekday, day, month } = dateParts(date);
  const staffName = `${confirmation.staff.first_name} ${confirmation.staff.last_name}`;
  const address = [business.address_line1, business.address_line2, business.city].filter(Boolean).join(', ');
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [business.name, address, business.state, business.postal_code].filter(Boolean).join(', '),
      )}`
    : null;

  // The details form is often scrolled well down on a phone; bring the confirmation into view
  // and move focus to it so screen readers announce it.
  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const addToCalendar = () =>
    downloadTextFile(
      `${business.slug}-appointment.ics`,
      buildCalendarFile({
        uid: confirmation.id,
        title: `${confirmation.service.name} at ${business.name}`,
        starts_at: confirmation.starts_at,
        ends_at: confirmation.ends_at,
        description: `With ${staffName}.${business.phone ? ` To change it, call ${business.phone}.` : ''}`,
        location: address || undefined,
      }),
      'text/calendar',
    );

  return (
    <div ref={containerRef} className="mx-auto max-w-md scroll-mt-6">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-8 ring-emerald-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="size-7" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 focus:outline-none">
          You&apos;re booked, {confirmation.customer.first_name}!
        </h2>
        <p className="mt-1.5 text-slate-500">Your appointment at {business.name} is confirmed.</p>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* When: the thing people look for first. */}
        <div className="flex items-center gap-4 p-5">
          <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-brand-50 py-2 text-brand-700 ring-1 ring-brand-100">
            <span className="text-xs font-semibold uppercase">{month}</span>
            <span className="text-2xl leading-none font-bold">{day}</span>
            <span className="mt-0.5 text-xs">{weekday}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{formatLongDate(date)}</p>
            <p className="mt-0.5 text-sm text-slate-600">
              {formatTimeInZone(confirmation.starts_at, timeZone)} – {formatTimeInZone(confirmation.ends_at, timeZone)}
              <span className="text-slate-400"> · {formatDuration(confirmation.service.duration_minutes)}</span>
            </p>
          </div>
        </div>

        <ul className="space-y-4 border-t border-dashed border-slate-200 p-5 text-sm">
          <DetailRow icon={<ServiceIcon />} label="Service">
            {confirmation.service.name}
          </DetailRow>
          <DetailRow icon={<PersonIcon />} label="With">
            {staffName}
          </DetailRow>
          <DetailRow icon={<PriceIcon />} label="Price">
            {formatPrice(confirmation.price, business.currency)}
          </DetailRow>
          {address && mapsUrl && (
            <DetailRow icon={<PinIcon />} label="Where">
              {address}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block w-fit text-sm font-medium text-brand-700 hover:underline"
              >
                Get directions →
              </a>
            </DetailRow>
          )}
        </ul>

        <div className="border-t border-slate-100 bg-slate-50 p-4">
          <Button onClick={addToCalendar} className="h-11 w-full">
            <CalendarIcon />
            Add to calendar
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-4 text-center text-sm">
        <p className="text-slate-500">
          Need to change or cancel?{' '}
          {business.phone ? (
            <a href={`tel:${business.phone}`} className="font-medium whitespace-nowrap text-brand-700 hover:underline">
              Call {business.phone}
            </a>
          ) : (
            'Please contact the business.'
          )}
        </p>
        <button type="button" onClick={onBookAnother} className="font-medium text-slate-600 hover:text-slate-900">
          Book another appointment
        </button>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <div className="font-medium text-slate-900">{children}</div>
      </div>
    </li>
  );
}

function ServiceIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 2a.75.75 0 0 1 .7.48l1.62 4.2 4.47.2a.75.75 0 0 1 .43 1.33l-3.5 2.79 1.2 4.33a.75.75 0 0 1-1.13.83L10 13.68l-3.75 2.48a.75.75 0 0 1-1.13-.83l1.2-4.33-3.5-2.8a.75.75 0 0 1 .43-1.32l4.47-.2 1.62-4.2A.75.75 0 0 1 10 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.47 15.15a.97.97 0 0 0 .42 1.17A11.95 11.95 0 0 0 10 18c2.24 0 4.33-.62 6.11-1.68a.97.97 0 0 0 .42-1.17 7 7 0 0 0-13.06 0Z" />
    </svg>
  );
}

function PriceIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M5.5 3A2.5 2.5 0 0 0 3 5.5v2.88c0 .66.26 1.3.73 1.77l6.5 6.5a2.5 2.5 0 0 0 3.54 0l2.88-2.88a2.5 2.5 0 0 0 0-3.54l-6.5-6.5A2.5 2.5 0 0 0 8.38 3H5.5ZM6 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="m9.69 18.93.01.01a.75.75 0 0 0 .6 0l.01-.01.03-.01a5.74 5.74 0 0 0 .5-.27c.3-.17.7-.43 1.18-.78A16.99 16.99 0 0 0 17 9.5a7 7 0 1 0-14 0 17 17 0 0 0 5.97 8.37 11.3 11.3 0 0 0 .72.46l.03.01ZM10 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
