import { useState } from 'react';
import { useToast } from '@/components/toast/use-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { useAuth } from '@/features/auth/context/use-auth';
import { formatDate, formatRelative } from '@/lib/date';
import { describeUserAgent } from '@/lib/user-agent';
import type { Session } from '@/types/models';
import { useLogoutAll, useRevokeSession, useSessions } from '../queries';

const PAGE_SIZE = 10;

/** The devices the user is signed in on, with sign-out per device or everywhere. */
export function SessionsCard() {
  const toast = useToast();
  const { signOut } = useAuth();
  const [page, setPage] = useState(1);
  const sessionsQuery = useSessions({ page, take: PAGE_SIZE });

  const revokeMutation = useRevokeSession();
  const logoutAllMutation = useLogoutAll();
  const [confirmingLogoutAll, setConfirmingLogoutAll] = useState(false);

  const signOutDevice = (session: Session) => {
    if (session.current) {
      void signOut();
      return;
    }
    revokeMutation.mutate(session.id, {
      onSuccess: () => toast.success(`Signed out of ${describeUserAgent(session.user_agent)}`),
      onError: (error) => toast.error(error),
    });
  };

  return (
    <Card>
      <CardHeader
        title="Devices"
        description="Most recently used first."
        actions={
          <Button variant="secondary" size="sm" onClick={() => setConfirmingLogoutAll(true)}>
            Sign out everywhere
          </Button>
        }
      />

      {sessionsQuery.isPending && <LoadingBlock label="Loading devices" />}
      {sessionsQuery.isError && (
        <ErrorBlock
          error={sessionsQuery.error}
          onRetry={() => void sessionsQuery.refetch()}
          isRetrying={sessionsQuery.isFetching}
        />
      )}

      {sessionsQuery.isSuccess && sessionsQuery.data.data.length === 0 && (
        <EmptyState title="No active sessions" />
      )}

      {sessionsQuery.isSuccess && sessionsQuery.data.data.length > 0 && (
        <>
          <ul className="divide-y divide-slate-100">
            {sessionsQuery.data.data.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                isSigningOut={revokeMutation.isPending && revokeMutation.variables === session.id}
                onSignOut={() => signOutDevice(session)}
              />
            ))}
          </ul>
          <Pagination meta={sessionsQuery.data.meta} onPageChange={setPage} itemLabel="devices" />
        </>
      )}

      <ConfirmDialog
        open={confirmingLogoutAll}
        title="Sign out everywhere?"
        message="You'll be signed out on every device, including this one, and will need to sign in again."
        confirmLabel="Sign out everywhere"
        tone="danger"
        isPending={logoutAllMutation.isPending}
        error={logoutAllMutation.error}
        onConfirm={() => logoutAllMutation.mutate()}
        onCancel={() => {
          setConfirmingLogoutAll(false);
          logoutAllMutation.reset();
        }}
      />
    </Card>
  );
}

interface SessionRowProps {
  session: Session;
  isSigningOut: boolean;
  onSignOut: () => void;
}

function SessionRow({ session, isSigningOut, onSignOut }: SessionRowProps) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
          {describeUserAgent(session.user_agent)}
          {session.current && <Badge tone="success">This device</Badge>}
        </p>
        <p className="mt-0.5 text-sm text-slate-500">
          {session.ip ?? 'Unknown IP'} · Signed in {formatDate(session.created_at)} · Active{' '}
          {formatRelative(session.last_used_at)}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={onSignOut} isLoading={isSigningOut}>
        Sign out
      </Button>
    </li>
  );
}
