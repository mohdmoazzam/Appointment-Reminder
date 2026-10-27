import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { paths } from '@/app/paths';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { Tabs } from '@/components/ui/Tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { useCurrentUser } from '@/features/auth/context/use-auth';
import { ClosuresNote } from '@/features/schedules/components/ClosuresNote';
import { TimeOffCard } from '@/features/schedules/components/TimeOffCard';
import { WorkingHoursCard } from '@/features/schedules/components/WorkingHoursCard';
import { StaffServicesCard } from '@/features/services/components/StaffServicesCard';
import { isApiErrorWithStatus } from '@/lib/api/api-error';
import { formatDate, formatRelative } from '@/lib/date';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { fullName } from '@/lib/names';
import type { User } from '@/types/models';
import { RoleBadge } from '../components/StaffBadges';
import { StaffActionDialog } from '../components/StaffActionDialog';
import { useStaffMember } from '../queries';
import { STAFF_ACTION_LABELS, availableStaffActions, type PendingStaffAction } from '../staff-actions';

type MemberTab = 'hours' | 'services' | 'time-off';

const TABS: { id: MemberTab; label: string }[] = [
  { id: 'hours', label: 'Working hours' },
  { id: 'services', label: 'Services' },
  { id: 'time-off', label: 'Time off' },
];

/** One team member: what they offer and when they work (`/staff/:userId`). */
export function StaffMemberPage() {
  const { userId = '' } = useParams<{ userId: string }>();
  const memberQuery = useStaffMember(userId);
  useDocumentTitle(memberQuery.data ? fullName(memberQuery.data) : 'Staff member');

  const backLink = (
    <Link to={paths.staff} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
        <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Staff
    </Link>
  );

  if (memberQuery.isPending) return <LoadingBlock label="Loading staff member" />;

  if (memberQuery.isError) {
    const notFound = isApiErrorWithStatus(memberQuery.error, 404) || isApiErrorWithStatus(memberQuery.error, 400);
    return (
      <>
        <div className="mb-4">{backLink}</div>
        <div className="rounded-xl border border-slate-200 bg-white">
          {/* 404 for an unknown id or a member of another business; 400 for a malformed id. */}
          {notFound ? (
            <EmptyState
              title="Staff member not found"
              action={
                <ButtonLink to={paths.staff} variant="secondary" size="sm">
                  Back to staff
                </ButtonLink>
              }
            />
          ) : (
            <ErrorBlock error={memberQuery.error} onRetry={() => void memberQuery.refetch()} isRetrying={memberQuery.isFetching} />
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-4">{backLink}</div>
      <MemberProfile member={memberQuery.data} />
    </>
  );
}

function MemberProfile({ member }: { member: User }) {
  const { user: currentUser, business, isOwner } = useCurrentUser();
  const [pendingAction, setPendingAction] = useState<PendingStaffAction | null>(null);
  const isSelf = member.id === currentUser.id;
  const name = fullName(member);

  // The open tab lives in the URL (?tab=services) so a refresh or shared link keeps it.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const tab: MemberTab = TABS.some((item) => item.id === requested) ? (requested as MemberTab) : 'hours';
  const selectTab = (next: MemberTab) => setSearchParams(next === 'hours' ? {} : { tab: next }, { replace: true });

  return (
    <>
      <header className="mb-6 flex flex-wrap items-start gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Avatar name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
            {name}
            {isSelf && <Badge>You</Badge>}
          </h1>
          <p className="truncate text-sm text-slate-500">{member.email}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
            <RoleBadge role={member.role} />
            {member.status === 'disabled' && <Badge tone="danger">Disabled</Badge>}
            <span>{member.last_login_at ? `Last active ${formatRelative(member.last_login_at)}` : 'Never signed in'}</span>
            <span aria-hidden="true">·</span>
            <span>Joined {formatDate(member.created_at)}</span>
          </div>
        </div>
        {isOwner && (
          <ActionMenu
            label={`Actions for ${name}`}
            items={availableStaffActions(member, isSelf).map((action) => ({
              label: STAFF_ACTION_LABELS[action],
              danger: action === 'disable',
              onSelect: () => setPendingAction({ member, action }),
            }))}
          />
        )}
      </header>

      <Tabs label={`${name}'s schedule`} className="mb-6" tabs={TABS} value={tab} onChange={selectTab} />

      <div role="tabpanel" id={tabPanelId(tab)} aria-labelledby={tabId(tab)} className="space-y-6">
        {tab === 'hours' && <WorkingHoursCard userId={member.id} canEdit={isOwner} />}
        {tab === 'services' && <StaffServicesCard userId={member.id} currency={business.currency} canEdit={isOwner} />}
        {tab === 'time-off' && (
          <>
            <TimeOffCard userId={member.id} canEdit={isOwner} />
            <ClosuresNote />
          </>
        )}
      </div>

      <StaffActionDialog pending={pendingAction} currentUserId={currentUser.id} onClose={() => setPendingAction(null)} />
    </>
  );
}
