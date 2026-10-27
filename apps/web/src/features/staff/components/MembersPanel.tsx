import { useState } from 'react';
import { controlStyles } from '@/components/ui/field-styles';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorBlock, LoadingBlock } from '@/components/ui/QueryStatus';
import { cn } from '@/lib/cn';
import { fullName } from '@/lib/names';
import type { User } from '@/types/models';
import { useStaffMembers } from '../queries';
import type { PendingStaffAction } from '../staff-actions';
import { MemberCard } from './MemberCard';
import { StaffActionDialog } from './StaffActionDialog';

/** The API's page-size limit; almost every team fits on one page, which search then filters. */
const PAGE_SIZE = 100;

interface MembersPanelProps {
  currentUserId: string;
  /** Owners can change roles and enable/disable accounts. */
  canManage: boolean;
}

/** Team members as cards, searchable, with disabled accounts tucked away. */
export function MembersPanel({ currentUserId, canManage }: MembersPanelProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showDisabled, setShowDisabled] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingStaffAction | null>(null);
  const membersQuery = useStaffMembers({ page, take: PAGE_SIZE, order: 'asc' });

  if (membersQuery.isPending) return <LoadingBlock label="Loading team" />;
  if (membersQuery.isError) {
    return <ErrorBlock error={membersQuery.error} onRetry={() => void membersQuery.refetch()} isRetrying={membersQuery.isFetching} />;
  }

  const matching = membersQuery.data.data.filter((member) => matchesSearch(member, search));
  const active = matching.filter((member) => member.status === 'active');
  const disabled = matching.filter((member) => member.status === 'disabled');

  const renderCards = (members: User[]) => (
    <ul className="grid gap-3 sm:grid-cols-2">
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          isSelf={member.id === currentUserId}
          canManage={canManage}
          onAction={(action) => setPendingAction({ member, action })}
        />
      ))}
    </ul>
  );

  return (
    <div className="space-y-5">
      <div className="relative max-w-sm">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.39l3.08 3.08a.75.75 0 1 1-1.06 1.06l-3.08-3.08A7 7 0 0 1 2 9Z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email"
          aria-label="Search team members"
          className={cn(controlStyles(false), 'pl-9')}
        />
      </div>

      {matching.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
          {search ? `Nobody matches “${search.trim()}”.` : 'No team members yet.'}
        </p>
      ) : (
        <>
          {active.length > 0 ? renderCards(active) : <p className="text-sm text-slate-500">No active members match.</p>}

          {disabled.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                aria-expanded={showDisabled}
                onClick={() => setShowDisabled((current) => !current)}
                className="text-sm font-medium text-slate-500 hover:text-slate-800"
              >
                {showDisabled ? 'Hide' : 'Show'} disabled accounts ({disabled.length})
              </button>
              {showDisabled && renderCards(disabled)}
            </div>
          )}
        </>
      )}

      {membersQuery.data.meta.pageCount > 1 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Pagination meta={membersQuery.data.meta} onPageChange={setPage} itemLabel="members" />
        </div>
      )}

      <StaffActionDialog pending={pendingAction} currentUserId={currentUserId} onClose={() => setPendingAction(null)} />
    </div>
  );
}

/** Case-insensitive match on full name or email; an empty search matches everyone. */
function matchesSearch(member: User, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return fullName(member).toLowerCase().includes(term) || member.email.toLowerCase().includes(term);
}
