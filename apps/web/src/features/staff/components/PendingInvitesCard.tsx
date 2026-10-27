import { useState } from 'react';
import { useToast } from '@/components/toast/use-toast';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell } from '@/components/ui/Table';
import { formatDate, formatRelative } from '@/lib/date';
import { fullName } from '@/lib/names';
import type { StaffInvite } from '@/types/models';
import { useCreateInvite, useRevokeInvite, useStaffInvites } from '../queries';
import { InviteLinkResult } from './InviteLinkResult';
import { RoleBadge } from './StaffBadges';

const PAGE_SIZE = 10;

interface PendingInvitesCardProps {
  /** Owners can create new links and revoke invites. */
  canManage: boolean;
}

export function PendingInvitesCard({ canManage }: PendingInvitesCardProps) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const invitesQuery = useStaffInvites({ page, take: PAGE_SIZE });

  const revokeMutation = useRevokeInvite();
  const [inviteToRevoke, setInviteToRevoke] = useState<StaffInvite | null>(null);

  // A new link is made by inviting the same person again; the API replaces the old invite.
  const reissueMutation = useCreateInvite();
  const [inviteToReissue, setInviteToReissue] = useState<StaffInvite | null>(null);

  const confirmRevoke = () => {
    if (!inviteToRevoke) return;
    revokeMutation.mutate(inviteToRevoke.id, {
      onSuccess: () => {
        toast.success(`Invite for ${inviteToRevoke.email} revoked`);
        setInviteToRevoke(null);
      },
    });
  };

  const confirmReissue = () => {
    if (!inviteToReissue) return;
    reissueMutation.mutate(
      {
        email: inviteToReissue.email,
        first_name: inviteToReissue.first_name,
        last_name: inviteToReissue.last_name,
        role: inviteToReissue.role,
      },
      { onSuccess: () => setInviteToReissue(null) },
    );
  };

  return (
    <Card>
      <CardHeader title="Pending invites" description="Invites that haven't been accepted yet." />

      {invitesQuery.isPending && <LoadingBlock label="Loading invites" />}
      {invitesQuery.isError && (
        <ErrorBlock
          error={invitesQuery.error}
          onRetry={() => void invitesQuery.refetch()}
          isRetrying={invitesQuery.isFetching}
        />
      )}

      {invitesQuery.isSuccess && invitesQuery.data.data.length === 0 && (
        <EmptyState
          title="No pending invites"
          description={
            canManage ? 'Invite your team so they can manage appointments too.' : undefined
          }
        />
      )}

      {invitesQuery.isSuccess && invitesQuery.data.data.length > 0 && (
        <>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Invitee</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Sent</TableHeaderCell>
                <TableHeaderCell>Expires</TableHeaderCell>
                {canManage && (
                  <TableHeaderCell className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHeaderCell>
                )}
              </tr>
            </TableHead>
            <TableBody>
              {invitesQuery.data.data.map((invite) => (
                <tr key={invite.id}>
                  <TableCell>
                    <p className="font-medium text-slate-900">{fullName(invite)}</p>
                    <p className="text-slate-500">{invite.email}</p>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={invite.role} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-500">
                    {formatDate(invite.created_at)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-500">
                    {formatRelative(invite.expires_at)}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setInviteToReissue(invite)}
                        >
                          New link
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setInviteToRevoke(invite)}>
                          Revoke
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </tr>
              ))}
            </TableBody>
          </Table>
          <Pagination meta={invitesQuery.data.meta} onPageChange={setPage} itemLabel="invites" />
        </>
      )}

      <ConfirmDialog
        open={inviteToRevoke !== null}
        title="Revoke invite?"
        message={
          inviteToRevoke && (
            <>
              The invite link sent to <strong>{inviteToRevoke.email}</strong> will stop working.
            </>
          )
        }
        confirmLabel="Revoke invite"
        tone="danger"
        isPending={revokeMutation.isPending}
        error={revokeMutation.error}
        onConfirm={confirmRevoke}
        onCancel={() => {
          setInviteToRevoke(null);
          revokeMutation.reset();
        }}
      />

      <ConfirmDialog
        open={inviteToReissue !== null}
        title="Create a new invite link?"
        message={
          inviteToReissue && (
            <>
              The link previously sent to <strong>{inviteToReissue.email}</strong> will stop working
              and you&apos;ll get a new one to share, with a fresh expiry date.
            </>
          )
        }
        confirmLabel="Create new link"
        isPending={reissueMutation.isPending}
        error={reissueMutation.error}
        onConfirm={confirmReissue}
        onCancel={() => {
          setInviteToReissue(null);
          reissueMutation.reset();
        }}
      />

      <Dialog
        open={reissueMutation.isSuccess}
        onClose={() => reissueMutation.reset()}
        title="New invite link"
      >
        {reissueMutation.data && <InviteLinkResult invite={reissueMutation.data} />}
        <DialogActions>
          <Button onClick={() => reissueMutation.reset()}>Done</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
