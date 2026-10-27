import { cn } from '@/lib/cn';

export type BookingStep = 'service' | 'time' | 'details';

const STEPS: { id: BookingStep; label: string }[] = [
  { id: 'service', label: 'Service' },
  { id: 'time', label: 'Time' },
  { id: 'details', label: 'Your details' },
];

interface BookingStepsProps {
  current: BookingStep;
  /** Going back to a finished step; later steps can't be jumped to. */
  onGoTo: (step: BookingStep) => void;
}

/** Progress through the booking: ① Service → ② Time → ③ Your details. */
export function BookingSteps({ current, onGoTo }: BookingStepsProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <nav aria-label="Booking progress">
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const content = (
            <>
              <span
                className={cn(
                  'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  done && 'bg-brand-600 text-white',
                  active && 'bg-brand-600 text-white ring-4 ring-brand-100',
                  !done && !active && 'bg-slate-200 text-slate-500',
                )}
              >
                {done ? (
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  'hidden text-sm font-medium sm:inline',
                  active ? 'text-slate-900' : done ? 'text-slate-700' : 'text-slate-400',
                )}
              >
                {step.label}
              </span>
            </>
          );

          return (
            <li key={step.id} className="flex items-center gap-2 sm:gap-3">
              {done ? (
                <button
                  type="button"
                  onClick={() => onGoTo(step.id)}
                  className="flex items-center gap-2 rounded-full hover:opacity-80"
                  aria-label={`Back to ${step.label}`}
                >
                  {content}
                </button>
              ) : (
                <span
                  className="flex items-center gap-2"
                  aria-current={active ? 'step' : undefined}
                >
                  {content}
                </span>
              )}
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-px w-6 sm:w-10',
                    index < currentIndex ? 'bg-brand-600' : 'bg-slate-200',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
