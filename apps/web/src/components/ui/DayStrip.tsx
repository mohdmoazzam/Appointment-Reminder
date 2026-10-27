import { addDaysToDate, dateParts, formatMonthYear, weekOf } from '@/lib/date';
import { cn } from '@/lib/cn';
import type { DateOnly } from '@/types/models';

interface DayStripProps {
  value: DateOnly;
  onChange: (date: DateOnly) => void;
  /** Today in the business's time zone: marked with a dot and reachable via "Today". */
  today: DateOnly;
  /** Earliest / latest selectable dates (inclusive), e.g. for online booking. */
  min?: DateOnly;
  max?: DateOnly;
}

/**
 * A week of day chips (Mon–Sun) with previous/next-week arrows, a "Today" shortcut and a date
 * picker for jumping further. Replaces a plain date input where picking a day is the main task.
 */
export function DayStrip({ value, onChange, today, min, max }: DayStripProps) {
  const days = weekOf(value);
  const isAllowed = (date: DateOnly) => (!min || date >= min) && (!max || date <= max);

  /** Moves a week, landing on the nearest allowed day. */
  const moveWeek = (direction: -1 | 1) => {
    let next = addDaysToDate(value, 7 * direction);
    if (min && next < min) next = min;
    if (max && next > max) next = max;
    onChange(next);
  };

  const previousWeekDisabled = min !== undefined && days[0]! <= min;
  const nextWeekDisabled = max !== undefined && days[6]! >= max;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{formatMonthYear(value)}</p>
        <div className="flex items-center gap-1">
          {value !== today && isAllowed(today) && (
            <button
              type="button"
              onClick={() => onChange(today)}
              className="rounded-md px-2.5 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              Today
            </button>
          )}
          <ArrowButton
            direction="previous"
            disabled={previousWeekDisabled}
            onClick={() => moveWeek(-1)}
          />
          <ArrowButton direction="next" disabled={nextWeekDisabled} onClick={() => moveWeek(1)} />
          <label className="relative inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <span className="sr-only">Pick a date</span>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              className="size-4"
              aria-hidden="true"
            >
              <rect x="3" y="4.5" width="14" height="12.5" rx="1.5" />
              <path d="M3 8.5h14M7 2.5v3M13 2.5v3" strokeLinecap="round" />
            </svg>
            {/* The native picker, invisible but covering the icon so clicking opens it. */}
            <input
              type="date"
              value={value}
              min={min}
              max={max}
              onChange={(event) => event.target.value && onChange(event.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>

      <div role="radiogroup" aria-label="Day" className="grid grid-cols-7 gap-1.5">
        {days.map((date) => {
          const parts = dateParts(date);
          const selected = date === value;
          const allowed = isAllowed(date);
          return (
            <button
              key={date}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${parts.weekday} ${parts.month} ${parts.day}${date === today ? ', today' : ''}`}
              disabled={!allowed}
              onClick={() => onChange(date)}
              className={cn(
                'relative flex flex-col items-center rounded-lg py-2 transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                selected
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent',
              )}
            >
              <span className={cn('text-xs', selected ? 'text-brand-100' : 'text-slate-500')}>
                {parts.weekday}
              </span>
              <span className="text-base font-semibold">{parts.day}</span>
              {date === today && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute bottom-1 size-1 rounded-full',
                    selected ? 'bg-white' : 'bg-brand-600',
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'previous' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={direction === 'previous' ? 'Previous week' : 'Next week'}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="size-4"
        aria-hidden="true"
      >
        <path
          d={direction === 'previous' ? 'm12 5-5 5 5 5' : 'm8 5 5 5-5 5'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
