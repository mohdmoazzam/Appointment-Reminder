import { useState } from 'react';
import { Outlet } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { useCurrentUser } from '@/features/auth/context/use-auth';
import { cn } from '@/lib/cn';
import { AppLogo } from './AppLogo';
import { CloseIcon, MenuIcon } from './icons';
import { SidebarNav } from './SidebarNav';
import { UserMenu } from './UserMenu';

/**
 * Shell for signed-in pages: sidebar (a slide-over menu on small screens), top bar with the
 * user menu, and the page itself in <Outlet />.
 */
export function AppLayout() {
  const { business } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Backdrop behind the mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform',
          'lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <AppLogo className="text-sm" />
          <button
            type="button"
            onClick={closeMobileMenu}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav onNavigate={closeMobileMenu} />
        </div>

        <div className="flex items-center gap-3 border-t border-slate-200 px-5 py-4">
          <Avatar name={business.name} imageUrl={business.logo_url} size="sm" shape="rounded" />
          <p className="truncate text-sm font-medium text-slate-900">{business.name}</p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
          aria-controls="app-sidebar"
          aria-expanded={mobileMenuOpen}
        >
          <MenuIcon className="size-6" />
        </button>
        <div className="flex-1" />
        <UserMenu />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
