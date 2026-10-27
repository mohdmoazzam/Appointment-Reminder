import { isRouteErrorResponse, useRouteError } from 'react-router';
import { paths } from '@/app/paths';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';

/**
 * Error boundary for the whole route tree: shown when rendering a page throws, or when a
 * lazily loaded page fails to download (e.g. after a deploy replaced the old bundle).
 */
export function RouteErrorPage() {
  const error = useRouteError();

  // Log the full error for debugging; the page only shows a short message.
  console.error('Unhandled route error', error);

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.';

  return (
    <main
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
    >
      <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">{message}</p>
      <div className="mt-6 flex gap-3">
        <ButtonLink to={paths.dashboard} variant="secondary">
          Go to the dashboard
        </ButtonLink>
        <Button onClick={() => window.location.reload()}>Reload the page</Button>
      </div>
    </main>
  );
}
