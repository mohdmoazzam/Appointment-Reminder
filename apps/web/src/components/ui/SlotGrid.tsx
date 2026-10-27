import { getErrorMessage } from '@/lib/api/api-error';
import { cn } from '@/lib/cn';
import { formatTimeOfDay } from '@/lib/date';
import type { IsoDateTime } from '@/types/api';
import type { Slot } from '@/types/models';
import { Spinner } from './Spinner';

interface SlotGridProps {
  slots: Slot[] | undefined;
  isLoading: boolean;
  error: unknown;
  /** starts_at of the chosen slot, or '' for none. */
  value: IsoDateTime | '';
  onChange: (slot: Slot) => void;
  /** Shown when the day has no free times. */
  emptyMessage?: string;
  /** Accessible name of the group, e.g. "Available times". */
  label?: string;
}

/**
 * Free start times as a grid of buttons, used by dashboard booking, rescheduling and the public
 * booking page. Times are the business's local times (slot.start_time).
 */
export function SlotGrid({
  slots,
  isLoading,
  error,
  value,
  onChange,
  emptyMessage = 'No free times on this day. Try another date.',
  label = 'Available times',
}: SlotGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
        <Spinner size="sm" label={null} /> Finding free times…
      </div>
    );
  }
  if (error) {
    return (
      <p role="alert" className="py-4 text-sm text-red-600">
        {getErrorMessage(error)}
      </p>
    );
  }
  if (!slots || slots.length === 0) {
    return <p className="py-4 text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div role="radiogroup" aria-label={label} className="space-y-4">
      {groupByPartOfDay(slots).map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
            {group.label}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {group.slots.map((slot) => {
              const selected = slot.starts_at === value;
              return (
                <button
                  key={slot.starts_at}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(slot)}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-sm font-medium transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                    selected
                      ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700',
                  )}
                >
                  {formatTimeOfDay(slot.start_time)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Morning before 12:00, afternoon before 17:00, evening after (business local time). */
const PARTS_OF_DAY = [
  { label: 'Morning', before: '12:00' },
  { label: 'Afternoon', before: '17:00' },
  { label: 'Evening', before: '24:00' },
] as const;

function groupByPartOfDay(slots: Slot[]): { label: string; slots: Slot[] }[] {
  let from = '00:00';
  const groups = PARTS_OF_DAY.map(({ label, before }) => {
    const inPart = slots.filter((slot) => slot.start_time >= from && slot.start_time < before);
    from = before;
    return { label, slots: inPart };
  });
  return groups.filter((group) => group.slots.length > 0);
}
