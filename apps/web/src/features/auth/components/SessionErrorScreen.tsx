import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/api/api-error';

interface SessionErrorScreenProps {
  error: unknown;
  onRetry: () => void;
  onSignOut: () => void;
}

/** Shown when a session exists but the current user can't be loaded (e.g. the API is down). */
export function SessionErrorScreen({ error, onRetry, onSignOut }: SessionErrorScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div role="alert" className="max-w-sm text-center">
        <h1 className="text-lg font-semibold text-slate-900">We couldn&apos;t load your account</h1>
        <p className="mt-2 text-sm text-slate-500">{getErrorMessage(error)}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={onSignOut}>
            Sign out
          </Button>
          <Button onClick={onRetry}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
