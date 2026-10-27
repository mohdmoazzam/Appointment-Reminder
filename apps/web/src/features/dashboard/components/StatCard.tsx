import { Link } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';

interface StatCardProps {
  label: string;
  /** Undefined while loading. */
  value: number | undefined;
  isError?: boolean;
  link?: { to: string; label: string };
}

/** A single number with a label, e.g. "Team members: 4". */
export function StatCard({ label, value, isError = false, link }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-2 flex h-9 items-center text-3xl font-semibold text-slate-900">
        {isError ? (
          <span className="text-base font-normal text-slate-400">Unavailable</span>
        ) : value === undefined ? (
          <Spinner size="sm" className="text-slate-400" />
        ) : (
          value
        )}
      </div>
      {link && (
        <Link
          to={link.to}
          className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}
