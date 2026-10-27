import type { ReactNode } from 'react';
import { AppLogo } from '@/components/layout/AppLogo';
import { cn } from '@/lib/cn';

interface AuthLayoutProps {
  title: string;
  description?: ReactNode;
  /** Shown under the card, e.g. "Don't have an account? Sign up". */
  footer?: ReactNode;
  /** Wider card for longer forms such as signup. */
  wide?: boolean;
  children: ReactNode;
}

/** Centered card used by the login, signup and invite pages. */
export function AuthLayout({
  title,
  description,
  footer,
  wide = false,
  children,
}: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <AppLogo className="mb-8 text-lg" />
      <div
        className={cn(
          'w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8',
          wide ? 'max-w-2xl' : 'max-w-md',
        )}
      >
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <p className="mt-6 text-sm text-slate-600">{footer}</p>}
    </main>
  );
}
