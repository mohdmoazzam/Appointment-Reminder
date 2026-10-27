import { Link, useParams } from 'react-router';
import { paths } from '@/app/paths';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { useCurrentUser } from '@/features/auth/context/use-auth';
import { ClosuresNote } from '@/features/schedules/components/ClosuresNote';
import { TimeOffCard } from '@/features/schedules/components/TimeOffCard';
import { WorkingHoursCard } from '@/features/schedules/components/WorkingHoursCard';
import { StaffServicesCard } from '@/features/services/components/StaffServicesCard';
import { isApiErrorWithStatus } from '@/lib/api/api-error';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { fullName } from '@/lib/names';
import { RoleBadge, StatusBadge } from '../components/StaffBadges';
import { useStaffMember } from '../queries';

/** One team member: what they offer and when they work (`/staff/:userId`). */
export function StaffMemberPage() {
  const { userId = '' } = useParams<{ userId: string }>();
  const { user: currentUser, business, isOwner } = useCurrentUser();
  const memberQuery = useStaffMember(userId);
  useDocumentTitle(memberQuery.data ? fullName(memberQuery.data) : 'Staff member');

  const backLink = (
    <Link to={paths.staff} className="text-sm font-medium text-slate-500 hover:text-slate-700">
      ← All staff
    </Link>
  );

  if (memberQuery.isPending) {
    return (
      <Card>
        <LoadingBlock label="Loading staff member" />
      </Card>
    );
  }

  if (memberQuery.isError) {
    return (
      <>
        <div className="mb-4">{backLink}</div>
        <Card>
          {/* 404 for an unknown id or a member of another business; 400 for a malformed id. */}
          {isApiErrorWithStatus(memberQuery.error, 404) ||
          isApiErrorWithStatus(memberQuery.error, 400) ? (
            <EmptyState
              title="Staff member not found"
              action={
                <ButtonLink to={paths.staff} variant="secondary" size="sm">
                  Back to staff
                </ButtonLink>
              }
            />
          ) : (
            <ErrorBlock
              error={memberQuery.error}
              onRetry={() => void memberQuery.refetch()}
              isRetrying={memberQuery.isFetching}
            />
          )}
        </Card>
      </>
    );
  }

  const member = memberQuery.data;
  const name = fullName(member);

  return (
    <>
      <div className="mb-4">{backLink}</div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={name} size="lg" />
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
            {name}
            {member.id === currentUser.id && <Badge>You</Badge>}
          </h1>
          <p className="truncate text-sm text-slate-500">{member.email}</p>
          <div className="mt-2 flex gap-2">
            <RoleBadge role={member.role} />
            <StatusBadge status={member.status} />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <StaffServicesCard userId={member.id} currency={business.currency} canEdit={isOwner} />
        <WorkingHoursCard userId={member.id} canEdit={isOwner} />
        <TimeOffCard userId={member.id} canEdit={isOwner} />
        <ClosuresNote />
      </div>
    </>
  );
}
