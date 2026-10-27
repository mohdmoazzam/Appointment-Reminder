import { useNavigate, useSearchParams } from 'react-router';
import { useToast } from '@/components/toast/use-toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import type { InAppNotification } from '@/types/models';
import { NotificationItem } from '../components/NotificationItem';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useUnreadNotificationCount } from '../queries';

const PAGE_SIZE = 20;

type NotificationFilter = 'all' | 'unread';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
] as const;

/** Every notification the signed-in user has had, newest first. Kept live by useNotificationStream. */
export function NotificationsPage() {
  useDocumentTitle('Notifications');
  const navigate = useNavigate();
  const toast = useToast();

  // Filter and page live in the URL (?filter=unread&page=2) so a refresh or the back button keeps them.
  const [searchParams, setSearchParams] = useSearchParams();
  const filter: NotificationFilter = searchParams.get('filter') === 'unread' ? 'unread' : 'all';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const setView = (next: { filter?: NotificationFilter; page?: number }) => {
    const nextFilter = next.filter ?? filter;
    const nextPage = next.page ?? 1;
    setSearchParams(
      {
        ...(nextFilter === 'unread' && { filter: nextFilter }),
        ...(nextPage > 1 && { page: String(nextPage) }),
      },
      { replace: true },
    );
  };

  const notificationsQuery = useNotifications({ page, take: PAGE_SIZE, order: 'desc', unread_only: filter === 'unread' });
  const { data: unread = 0 } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleOpen = (notification: InAppNotification) => {
    if (!notification.read_at) markRead.mutate(notification.id, { onError: toast.error });
    if (notification.link) void navigate(notification.link);
  };

  const renderList = () => {
    if (notificationsQuery.isPending) return <LoadingBlock label="Loading notifications" />;
    if (notificationsQuery.isError) {
      return (
        <ErrorBlock
          error={notificationsQuery.error}
          onRetry={() => void notificationsQuery.refetch()}
          isRetrying={notificationsQuery.isFetching}
        />
      );
    }

    const { data: notifications, meta } = notificationsQuery.data;
    // Reading the last unread item on a later page can leave that page empty; step back.
    if (notifications.length === 0 && page > 1 && !notificationsQuery.isPlaceholderData) {
      return (
        <EmptyState
          title="Nothing on this page"
          action={
            <Button variant="secondary" size="sm" onClick={() => setView({ page: 1 })}>
              Back to the first page
            </Button>
          }
        />
      );
    }
    if (notifications.length === 0) {
      return filter === 'unread' ? (
        <EmptyState
          title="You're all caught up"
          description="No unread notifications."
          action={
            <Button variant="secondary" size="sm" onClick={() => setView({ filter: 'all' })}>
              Show all notifications
            </Button>
          }
        />
      ) : (
        <EmptyState title="No notifications yet" description="New online bookings and other updates show up here." />
      );
    }

    return (
      <>
        <ul className="divide-y divide-slate-100">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <NotificationItem notification={notification} onOpen={handleOpen} />
            </li>
          ))}
        </ul>
        <Pagination meta={meta} onPageChange={(next) => setView({ page: next })} itemLabel="notifications" />
      </>
    );
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : 'Online bookings and other updates for your business.'}
        actions={
          unread > 0 && (
            <Button
              variant="secondary"
              size="sm"
              isLoading={markAllRead.isPending}
              onClick={() =>
                markAllRead.mutate(undefined, {
                  onSuccess: () => toast.success('All notifications marked as read'),
                  onError: toast.error,
                })
              }
            >
              Mark all as read
            </Button>
          )
        }
      />

      <SegmentedControl label="Show" options={FILTER_OPTIONS} value={filter} onChange={(next) => setView({ filter: next })} />

      <Card className="mt-4 overflow-hidden">{renderList()}</Card>
    </>
  );
}
