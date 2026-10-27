import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { DayStrip } from '@/components/ui/DayStrip';
import { SlotGrid } from '@/components/ui/SlotGrid';
import { getErrorMessage } from '@/lib/api/api-error';
import { cn } from '@/lib/cn';
import { formatLongDate } from '@/lib/date';
import type { DateOnly, Slot } from '@/types/models';
import { NEXT_AVAILABLE_SEARCH_DAYS, useFindNextAvailableDate, usePublicSlots } from '../queries';
import type { PublicService } from '../types';

interface TimeStepProps {
  slug: string;
  service: PublicService;
  /** '' for anyone available. */
  staffId: string;
  onStaffChange: (staffId: string) => void;
  date: DateOnly;
  onDateChange: (date: DateOnly) => void;
  today: DateOnly;
  lastDay: DateOnly;
  onSelect: (slot: Slot) => void;
  /** Shown when a previously chosen time was taken by someone else. */
  notice: string | null;
}

/** Step 2: who (optional) and when. Picking a time moves on to the details. */
export function TimeStep({
  slug,
  service,
  staffId,
  onStaffChange,
  date,
  onDateChange,
  today,
  lastDay,
  onSelect,
  notice,
}: TimeStepProps) {
  const slotsQuery = usePublicSlots(slug, {
    service_id: service.id,
    date,
    staff_id: staffId || undefined,
  });
  const findNextAvailableDate = useFindNextAvailableDate(slug);
  const [search, setSearch] = useState<{ status: 'idle' | 'searching' | 'none'; error?: unknown }>({
    status: 'idle',
  });

  const changeDate = (next: DateOnly) => {
    setSearch({ status: 'idle' });
    onDateChange(next);
  };

  const findNext = async () => {
    setSearch({ status: 'searching' });
    try {
      const next = await findNextAvailableDate(
        { service_id: service.id, staff_id: staffId || undefined },
        date,
        lastDay,
      );
      if (next) changeDate(next);
      else setSearch({ status: 'none' });
    } catch (error) {
      setSearch({ status: 'idle', error });
    }
  };

  const dayIsFull = slotsQuery.isSuccess && slotsQuery.data.length === 0;

  return (
    <div className="space-y-6">
      {notice && <Alert tone="warning">{notice}</Alert>}

      {service.staff.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">With</p>
          <div
            role="radiogroup"
            aria-label="Who would you like to see?"
            className="flex flex-wrap gap-2"
          >
            <StaffPill
              selected={staffId === ''}
              onClick={() => onStaffChange('')}
              name="Anyone available"
            />
            {service.staff.map((member) => (
              <StaffPill
                key={member.id}
                selected={staffId === member.id}
                onClick={() => onStaffChange(member.id)}
                name={`${member.first_name} ${member.last_name}`}
                avatarName={`${member.first_name} ${member.last_name}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <DayStrip value={date} onChange={changeDate} today={today} min={today} max={lastDay} />
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-slate-700">{formatLongDate(date)}</p>
        {dayIsFull ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="font-medium text-slate-900">No free times on this day</p>
            {search.status === 'none' ? (
              <p className="mt-1 text-sm text-slate-500">
                Nothing free in the next {NEXT_AVAILABLE_SEARCH_DAYS} days. Try a later date.
              </p>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                isLoading={search.status === 'searching'}
                onClick={() => void findNext()}
              >
                Find next available day
              </Button>
            )}
            {search.error !== undefined && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {getErrorMessage(search.error)}
              </p>
            )}
          </div>
        ) : (
          <SlotGrid
            slots={slotsQuery.data}
            isLoading={slotsQuery.isFetching && !slotsQuery.data}
            error={slotsQuery.error}
            value=""
            onChange={onSelect}
          />
        )}
      </div>
    </div>
  );
}

interface StaffPillProps {
  selected: boolean;
  onClick: () => void;
  name: string;
  /** Shows initials; omitted for "Anyone available". */
  avatarName?: string;
}

function StaffPill({ selected, onClick, name, avatarName }: StaffPillProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border py-1 pr-3.5 text-sm font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        avatarName ? 'pl-1' : 'pl-3.5',
        selected
          ? 'border-brand-600 bg-brand-50 text-brand-700'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
      )}
    >
      {avatarName && <Avatar name={avatarName} size="sm" />}
      {name}
    </button>
  );
}
