import { formatDuration } from '@/lib/durations';
import { formatPrice } from '@/lib/money';
import type { PublicService } from '../types';

interface ServiceStepProps {
  services: PublicService[];
  currency: string;
  onSelect: (service: PublicService) => void;
}

/** Step 1: what to book. */
export function ServiceStep({ services, currency, onSelect }: ServiceStepProps) {
  if (services.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Online booking isn&apos;t available right now. Please contact the business directly.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {services.map((service) => (
        <li key={service.id}>
          <button
            type="button"
            onClick={() => onSelect(service)}
            className="flex w-full items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-500 focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{service.name}</p>
              {service.description && (
                <p className="mt-1 text-sm text-slate-500">{service.description}</p>
              )}
              <p className="mt-1 text-sm text-slate-500">
                {formatDuration(service.duration_minutes)}
              </p>
            </div>
            <p className="shrink-0 font-medium text-slate-900">
              {formatPrice(service.price, currency)}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}
