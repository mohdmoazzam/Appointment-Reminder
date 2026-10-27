import { useState } from 'react';
import { useToast } from '@/components/toast/use-toast';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { formatRelative } from '@/lib/date';
import { fullName } from '@/lib/names';
import type { StaffInvite } from '@/types/models';
import { useCreateInvite, useRevokeInvite, useStaffInvites } from '../queries';
import { InviteLinkResult } from './InviteLinkResult';
import { RoleBadge } from './StaffBadges';

const PAGE_SIZE = 20;

interface InvitesPanelProps {
  /** Owners can resend and revoke invites. */
  canManage: boolean;
  /** Opens the invite dialog (shown in the empty state). */
  onInvite?: () => void;
}

/** Invites that haven't been accepted yet, with "resend" and "revoke" in a ⋯ menu. */
export function InvitesPanel({ canManage, onInvite }: InvitesPanelProps) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const invitesQuery = useStaffInvites({ page, take: PAGE_SIZE });

  const revokeMutation = useRevokeInvite();
  const [inviteToRevoke, setInviteToRevoke] = useState<StaffInvite | null>(null);

  // Resending invites the same person again; the API replaces the old invite and emails a new link.
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

  if (invitesQuery.isPending) return <LoadingBlock label="Loading invites" />;
  if (invitesQuery.isError) {
    return <ErrorBlock error={invitesQuery.error} onRetry={() => void invitesQuery.refetch()} isRetrying={invitesQuery.isFetching} />;
  }

  const invites = invitesQuery.data.data;

  return (
    <div className="space-y-4">
      {invites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="font-medium text-slate-900">No pending invites</p>
          <p className="mt-1 text-sm text-slate-500">Everyone you invited has joined, or you haven&apos;t invited anyone yet.</p>
          {canManage && onInvite && (
            <Button variant="secondary" size="sm" className="mt-5" onClick={onInvite}>
              Invite someone
            </Button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {invites.map((invite) => (
            <li key={invite.id} className="flex items-center gap-4 px-4 py-3">
              <div className="opacity-60">
                <Avatar name={fullName(invite)} size="sm" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{fullName(invite)}</p>
                <p className="truncate text-xs text-slate-500">{invite.email}</p>
              </div>
              <div className="hidden shrink-0 items-center gap-3 sm:flex">
                <RoleBadge role={invite.role} />
                <span className="text-xs text-slate-500">Expires {formatRelative(invite.expires_at)}</span>
              </div>
              {canManage && (
                <ActionMenu
                  label={`Actions for the invite to ${invite.email}`}
                  items={[
                    { label: 'Resend invite', onSelect: () => setInviteToReissue(invite) },
                    {
                      label: 'Revoke invite',
                      danger: true,
                      onSelect: () => setInviteToRevoke(invite),
                    },
                  ]}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {invitesQuery.data.meta.pageCount > 1 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Pagination meta={invitesQuery.data.meta} onPageChange={setPage} itemLabel="invites" />
        </div>
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
        title="Resend invite?"
        message={
          inviteToReissue && (
            <>
              The link previously sent to <strong>{inviteToReissue.email}</strong> will stop working and they&apos;ll be emailed a new one,
              with a fresh expiry date.
            </>
          )
        }
        confirmLabel="Resend invite"
        isPending={reissueMutation.isPending}
        error={reissueMutation.error}
        onConfirm={confirmReissue}
        onCancel={() => {
          setInviteToReissue(null);
          reissueMutation.reset();
        }}
      />

      <Dialog open={reissueMutation.isSuccess} onClose={() => reissueMutation.reset()} title="Invite resent">
        {reissueMutation.data && <InviteLinkResult invite={reissueMutation.data} />}
        <DialogActions>
          <Button onClick={() => reissueMutation.reset()}>Done</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
