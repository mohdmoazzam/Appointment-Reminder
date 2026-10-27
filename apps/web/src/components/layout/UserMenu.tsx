import { useCallback, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth, useCurrentUser } from '@/features/auth/context/use-auth';
import { cn } from '@/lib/cn';
import { useDismiss, type DismissReason } from '@/lib/hooks/use-dismiss';
import { fullName } from '@/lib/names';
import { USER_ROLE_LABELS } from '@/types/enums';
import { ChevronDownIcon, DevicesIcon, LogoutIcon, UserCircleIcon } from './icons';

const MENU_ITEM_CLASSES =
  'flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 ' +
  'hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none disabled:opacity-60';

/**
 * The signed-in user's profile button in the top bar; opens a menu with Account, Signed-in
 * devices and Sign out.
 */
export function UserMenu() {
  const { signOut } = useAuth();
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const name = fullName(user);

  const closeMenu = useCallback(() => setOpen(false), []);

  // Escape returns focus to the button so keyboard users don't lose their place; an outside
  // click leaves focus wherever the user clicked.
  const dismissMenu = useCallback((reason: DismissReason) => {
    setOpen(false);
    if (reason === 'escape') triggerRef.current?.focus();
  }, []);
  useDismiss(containerRef, open, dismissMenu);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    // signOut never rejects; once it finishes this component is unmounted by the route guard.
    await signOut();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={cn(
          'flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-100',
          'focus-visible:outline-2 focus-visible:outline-brand-600',
          open && 'bg-slate-100',
        )}
      >
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">{USER_ROLE_LABELS[user.role]}</p>
        </div>
        <Avatar name={name} size="sm" />
        <span className="sr-only">Open profile menu</span>
        <ChevronDownIcon
          className={cn('size-4 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Profile"
          className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-medium text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>

          <div className="py-1">
            <Link
              to={paths.account}
              role="menuitem"
              onClick={closeMenu}
              className={MENU_ITEM_CLASSES}
            >
              <UserCircleIcon className="size-4 text-slate-500" />
              Account
            </Link>
            <Link
              to={paths.devices}
              role="menuitem"
              onClick={closeMenu}
              className={MENU_ITEM_CLASSES}
            >
              <DevicesIcon className="size-4 text-slate-500" />
              Signed-in devices
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
              className={cn(MENU_ITEM_CLASSES, 'text-red-600 hover:text-red-700')}
            >
              {isSigningOut ? (
                <Spinner size="sm" label={null} />
              ) : (
                <LogoutIcon className="size-4" />
              )}
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
