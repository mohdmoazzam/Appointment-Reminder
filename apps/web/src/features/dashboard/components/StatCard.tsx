import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

interface StatCardProps {
  label: string;
  /** Undefined while loading. */
  value: ReactNode | undefined;
  isError?: boolean;
  /** Small line under the value, e.g. "2 pending invites". */
  hint?: ReactNode;
  icon: ComponentType<{ className?: string }>;
  /** Makes the whole tile a link. */
  to?: string;
}

/** A single figure with a label and icon, e.g. "Today: 6". */
export function StatCard({ label, value, isError = false, hint, icon: Icon, to }: StatCardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="size-4.5" />
        </span>
      </div>
      <div className="mt-3 flex h-8 items-center text-2xl font-semibold tracking-tight text-slate-900">
        {isError ? (
          <span className="text-sm font-normal text-slate-400">Unavailable</span>
        ) : value === undefined ? (
          <span className="h-6 w-12 animate-pulse rounded bg-slate-100" aria-label="Loading" />
        ) : (
          value
        )}
      </div>
      {hint && <p className="mt-1 truncate text-xs text-slate-500">{hint}</p>}
    </>
  );

  const className = cn(
    'block rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
    to &&
      'transition hover:border-brand-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
  );

  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
