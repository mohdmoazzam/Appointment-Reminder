import { useCallback, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { paths } from '@/app/paths';
import { BellIcon } from '@/components/layout/icons';
import { useToast } from '@/components/toast/use-toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { getErrorMessage } from '@/lib/api/api-error';
import { cn } from '@/lib/cn';
import { useDismiss, type DismissReason } from '@/lib/hooks/use-dismiss';
import type { InAppNotification } from '@/types/models';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useRecentNotifications, useUnreadNotificationCount } from '../queries';
import { NotificationItem } from './NotificationItem';

/** Badges show at most this; more reads "9+". */
const MAX_BADGE_COUNT = 9;

/**
 * The bell in the top bar: the unread count, and a panel with the latest notifications. Kept
 * live by useNotificationStream (mounted by AppLayout).
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: unread = 0 } = useUnreadNotificationCount();
  const recent = useRecentNotifications(open);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const dismissPanel = useCallback((reason: DismissReason) => {
    setOpen(false);
    if (reason === 'escape') triggerRef.current?.focus();
  }, []);
  useDismiss(containerRef, open, dismissPanel);

  const handleOpen = (notification: InAppNotification) => {
    if (!notification.read_at) markRead.mutate(notification.id, { onError: toast.error });
    if (notification.link) {
      setOpen(false);
      void navigate(notification.link);
    }
  };

  const badge = unread > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(unread);
  const notifications = recent.data?.data ?? [];

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={cn(
          'relative rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100',
          'focus-visible:outline-2 focus-visible:outline-brand-600',
          open && 'bg-slate-100',
        )}
      >
        <BellIcon className="size-5" />
        <span className="sr-only">{unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}</span>
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-none font-semibold text-white ring-2 ring-white"
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className={cn(
            'z-30 mt-2 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg',
            // Phones: span the screen under the top bar (the bell isn't at the right edge, so anchoring
            // to it pushes the panel off-screen). Larger screens: a dropdown under the bell.
            'fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:w-88',
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate(undefined, { onError: toast.error })}
                disabled={markAllRead.isPending}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-60"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[min(24rem,calc(100dvh-12rem))] overflow-y-auto">
            {recent.isPending ? (
              <div className="flex justify-center py-10 text-slate-400">
                <Spinner />
              </div>
            ) : recent.isError ? (
              <p className="px-4 py-6 text-sm text-red-600">{getErrorMessage(recent.error)}</p>
            ) : notifications.length === 0 ? (
              <EmptyState title="You're all caught up" description="New online bookings and other updates show up here." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <NotificationItem notification={notification} onOpen={handleOpen} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            to={paths.notifications}
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-brand-600 hover:bg-slate-50 hover:text-brand-700"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
