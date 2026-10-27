import { useState } from 'react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { useToast } from '@/components/toast/use-toast';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell } from '@/components/ui/Table';
import { formatRelative } from '@/lib/date';
import { fullName } from '@/lib/names';
import type { User } from '@/types/models';
import { useStaffMembers, useUpdateStaff } from '../queries';
import {
  STAFF_ACTION_LABELS,
  availableStaffActions,
  describeStaffAction,
  staffActionRequest,
  type PendingStaffAction,
} from '../staff-actions';
import { RoleBadge, StatusBadge } from './StaffBadges';

const PAGE_SIZE = 20;

interface TeamMembersCardProps {
  currentUserId: string;
  /** Owners see the actions column. */
  canManage: boolean;
}

export function TeamMembersCard({ currentUserId, canManage }: TeamMembersCardProps) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const membersQuery = useStaffMembers({ page, take: PAGE_SIZE, order: 'asc' });
  const updateMutation = useUpdateStaff();
  const [pendingAction, setPendingAction] = useState<PendingStaffAction | null>(null);

  const pendingCopy = pendingAction
    ? describeStaffAction(pendingAction, pendingAction.member.id === currentUserId)
    : null;

  const closeDialog = () => {
    setPendingAction(null);
    updateMutation.reset();
  };

  const confirmPendingAction = () => {
    if (!pendingAction || !pendingCopy) return;
    updateMutation.mutate(
      { userId: pendingAction.member.id, request: staffActionRequest(pendingAction.action) },
      {
        onSuccess: () => {
          toast.success(pendingCopy.successMessage);
          setPendingAction(null);
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader title="Team members" description="Everyone who can sign in to your business." />

      {membersQuery.isPending && <LoadingBlock label="Loading team" />}
      {membersQuery.isError && (
        <ErrorBlock
          error={membersQuery.error}
          onRetry={() => void membersQuery.refetch()}
          isRetrying={membersQuery.isFetching}
        />
      )}

      {membersQuery.isSuccess && membersQuery.data.data.length === 0 && (
        <EmptyState title="No team members yet" />
      )}

      {membersQuery.isSuccess && membersQuery.data.data.length > 0 && (
        <>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Member</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Last sign-in</TableHeaderCell>
                <TableHeaderCell className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {membersQuery.data.data.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isSelf={member.id === currentUserId}
                  canManage={canManage}
                  onAction={(action) => setPendingAction({ member, action })}
                />
              ))}
            </TableBody>
          </Table>
          <Pagination meta={membersQuery.data.meta} onPageChange={setPage} itemLabel="members" />
        </>
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingCopy?.title ?? ''}
        message={pendingCopy?.message}
        confirmLabel={pendingCopy?.confirmLabel ?? 'Confirm'}
        tone={pendingCopy?.tone}
        isPending={updateMutation.isPending}
        error={updateMutation.error}
        onConfirm={confirmPendingAction}
        onCancel={closeDialog}
      />
    </Card>
  );
}

interface MemberRowProps {
  member: User;
  isSelf: boolean;
  canManage: boolean;
  onAction: (action: PendingStaffAction['action']) => void;
}

function MemberRow({ member, isSelf, canManage, onAction }: MemberRowProps) {
  const name = fullName(member);

  return (
    <tr>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar name={name} size="sm" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-medium text-slate-900">
              <Link
                to={paths.staffMember(member.id)}
                className="hover:text-brand-700 hover:underline"
              >
                {name}
              </Link>
              {isSelf && <Badge>You</Badge>}
            </p>
            <p className="truncate text-slate-500">{member.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <RoleBadge role={member.role} />
      </TableCell>
      <TableCell>
        <StatusBadge status={member.status} />
      </TableCell>
      <TableCell className="whitespace-nowrap text-slate-500">
        {member.last_login_at ? formatRelative(member.last_login_at) : 'Never'}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-2">
          {/* Services, working hours and time off live on the member's page. */}
          <ButtonLink to={paths.staffMember(member.id)} size="sm" variant="secondary">
            Schedule
          </ButtonLink>
          {canManage &&
            availableStaffActions(member, isSelf).map((action) => (
              <Button
                key={action}
                size="sm"
                variant={action === 'disable' ? 'ghost' : 'secondary'}
                onClick={() => onAction(action)}
              >
                {STAFF_ACTION_LABELS[action]}
              </Button>
            ))}
        </div>
      </TableCell>
    </tr>
  );
}
