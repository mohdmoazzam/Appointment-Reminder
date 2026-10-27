import type { ReactNode } from 'react';
import { dateInZone, formatLongDate, formatTimeInZone } from '@/lib/date';
import { formatDuration } from '@/lib/durations';
import { formatPrice } from '@/lib/money';
import type { Slot } from '@/types/models';
import type { PublicBusiness, PublicService, PublicStaffMember } from '../types';

interface BookingSummaryProps {
  business: PublicBusiness;
  service: PublicService | null;
  /** The chosen person, or null for "anyone available". */
  staff: PublicStaffMember | null;
  slot: Slot | null;
}

/** "Your booking": what's been chosen so far. Sticky beside the steps on wide screens. */
export function BookingSummary({ business, service, staff, slot }: BookingSummaryProps) {
  const timeZone = business.timezone;

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
      <h2 className="text-sm font-semibold text-slate-900">Your booking</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <SummaryRow label="Service" placeholder="Choose a service">
          {service && (
            <>
              {service.name}
              <span className="block text-xs text-slate-500">
                {formatDuration(service.duration_minutes)}
              </span>
            </>
          )}
        </SummaryRow>
        {service && (
          <SummaryRow label="With">
            {staff ? `${staff.first_name} ${staff.last_name}` : 'Anyone available'}
          </SummaryRow>
        )}
        <SummaryRow label="When" placeholder="Pick a time">
          {slot && (
            <>
              {formatLongDate(dateInZone(slot.starts_at, timeZone))}
              <span className="block text-xs text-slate-500">
                {formatTimeInZone(slot.starts_at, timeZone)} –{' '}
                {formatTimeInZone(slot.ends_at, timeZone)}
              </span>
            </>
          )}
        </SummaryRow>
      </dl>
      {service && (
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-sm text-slate-500">Price</span>
          <span className="text-base font-semibold text-slate-900">
            {formatPrice(service.price, business.currency)}
          </span>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-400">
        Times are in {business.timezone.replaceAll('_', ' ')}.
      </p>
    </aside>
  );
}

function SummaryRow({
  label,
  placeholder,
  children,
}: {
  label: string;
  placeholder?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">
        {children || <span className="font-normal text-slate-400">{placeholder}</span>}
      </dd>
    </div>
  );
}
