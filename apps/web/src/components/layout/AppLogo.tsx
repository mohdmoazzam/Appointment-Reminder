import { cn } from '@/lib/cn';

/** The app's mark (a calendar with a check) and name. */
export function AppLogo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold text-slate-900', className)}>
      <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="size-5"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
          <path d="m9 15 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      Appointment Reminder
    </span>
  );
}
