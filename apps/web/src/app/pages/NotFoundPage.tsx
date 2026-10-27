import { paths } from '@/app/paths';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';

export function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <ButtonLink to={paths.dashboard} className="mt-6">
        Go to the dashboard
      </ButtonLink>
    </main>
  );
}
