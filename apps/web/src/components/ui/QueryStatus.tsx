import { getErrorMessage } from '@/lib/api/api-error';
import { Button } from './Button';
import { Spinner } from './Spinner';

/** Placeholder while a query loads. */
export function LoadingBlock({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 px-5 py-10 text-slate-500">
      <Spinner size="md" label={null} />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

interface ErrorBlockProps {
  error: unknown;
  /** Usually the query's refetch. */
  onRetry?: () => void;
  isRetrying?: boolean;
}

/** Shown in place of content when a query fails. */
export function ErrorBlock({ error, onRetry, isRetrying }: ErrorBlockProps) {
  return (
    <div role="alert" className="px-5 py-10 text-center">
      <p className="text-sm font-medium text-slate-900">Couldn&apos;t load this</p>
      <p className="mt-1 text-sm text-slate-500">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={onRetry}
          isLoading={isRetrying}
        >
          Try again
        </Button>
      )}
    </div>
  );
}

/** Centered spinner filling the screen, used while the session is being restored. */
export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-brand-600">
      <Spinner size="lg" />
    </div>
  );
}
