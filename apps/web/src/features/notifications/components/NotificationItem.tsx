import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative } from '@/lib/date';
import type { InAppNotification } from '@/types/models';

interface NotificationItemProps {
  notification: InAppNotification;
  onOpen: (notification: InAppNotification) => void;
}

/** One notification as a clickable row: a dot and bold title while unread. Used by the bell and the page. */
export function NotificationItem({ notification, onOpen }: NotificationItemProps) {
  const unread = !notification.read_at;
  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={cn(
        'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50',
        'focus-visible:bg-slate-50 focus-visible:outline-none',
        unread && 'bg-brand-50/40',
      )}
    >
      <span aria-hidden="true" className={cn('mt-1.5 size-2 shrink-0 rounded-full', unread ? 'bg-brand-600' : 'bg-transparent')} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('truncate text-sm text-slate-900', unread ? 'font-semibold' : 'font-medium')}>{notification.title}</span>
          <time
            dateTime={notification.created_at}
            title={formatDateTime(notification.created_at)}
            className="shrink-0 text-xs text-slate-400"
          >
            {formatRelative(notification.created_at)}
          </time>
        </span>
        <span className="mt-0.5 block text-sm text-slate-600">{notification.body}</span>
        {unread && <span className="sr-only">Unread</span>}
      </span>
    </button>
  );
}
