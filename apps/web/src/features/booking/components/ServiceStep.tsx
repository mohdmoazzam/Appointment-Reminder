import { formatDuration } from '@/lib/durations';
import { formatPrice } from '@/lib/money';
import type { PublicService } from '../types';

interface ServiceStepProps {
  services: PublicService[];
  currency: string;
  onSelect: (service: PublicService) => void;
}

/** Step 1: what to book, as cards. */
export function ServiceStep({ services, currency, onSelect }: ServiceStepProps) {
  if (services.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <p className="font-medium text-slate-900">Online booking isn&apos;t open yet</p>
        <p className="mt-1 text-sm text-slate-500">Please contact the business directly to book.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {services.map((service) => (
        <li key={service.id}>
          <button
            type="button"
            onClick={() => onSelect(service)}
            className="group flex h-full w-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="font-semibold text-slate-900 group-hover:text-brand-700">
                {service.name}
              </span>
              <span className="shrink-0 font-semibold text-slate-900">
                {formatPrice(service.price, currency)}
              </span>
            </span>
            {service.description && (
              <span className="mt-1.5 line-clamp-2 text-sm text-slate-500">
                {service.description}
              </span>
            )}
            <span className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-3.5"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-12.5a.75.75 0 0 0-1.5 0V10c0 .2.08.39.22.53l2.5 2.5a.75.75 0 1 0 1.06-1.06l-2.28-2.28V5.5Z"
                    clipRule="evenodd"
                  />
                </svg>
                {formatDuration(service.duration_minutes)}
              </span>
              {service.staff.length > 0 && (
                <span className="min-w-0">
                  with{' '}
                  {service.staff
                    .map((member) => `${member.first_name} ${member.last_name}`)
                    .join(', ')}
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
