import { useSearchParams } from 'react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { useCurrentUser } from '@/features/auth/context/use-auth';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { InviteStaffDialog } from '../components/InviteStaffDialog';
import { InvitesPanel } from '../components/InvitesPanel';
import { MembersPanel } from '../components/MembersPanel';
import { useStaffInvites, useStaffMembers } from '../queries';

type StaffTab = 'members' | 'invites';

/** Only the totals are needed for the tab counts. */
const COUNT_ONLY = { page: 1, take: 1 } as const;

export function StaffPage() {
  useDocumentTitle('Staff');
  const { user, isOwner } = useCurrentUser();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // The open tab lives in the URL (?tab=invites) so a refresh or a shared link keeps it.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: StaffTab = searchParams.get('tab') === 'invites' ? 'invites' : 'members';
  const selectTab = (next: StaffTab) => setSearchParams(next === 'members' ? {} : { tab: next }, { replace: true });

  const memberCount = useStaffMembers(COUNT_ONLY).data?.meta.count;
  const inviteCount = useStaffInvites(COUNT_ONLY).data?.meta.count;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Staff</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isOwner
              ? 'Your team, their services and working hours. Open someone to edit their schedule.'
              : 'The people who work at your business.'}
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setInviteDialogOpen(true)}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
              <path d="M10 4a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 10 4Z" />
            </svg>
            Invite staff
          </Button>
        )}
      </div>

      <Tabs
        label="Staff"
        className="mb-6"
        value={tab}
        onChange={selectTab}
        tabs={[
          { id: 'members', label: 'Members', count: memberCount },
          { id: 'invites', label: 'Pending invites', count: inviteCount },
        ]}
      />

      <div role="tabpanel" id={tabPanelId(tab)} aria-labelledby={tabId(tab)}>
        {tab === 'members' ? (
          <MembersPanel currentUserId={user.id} canManage={isOwner} />
        ) : (
          <InvitesPanel canManage={isOwner} onInvite={() => setInviteDialogOpen(true)} />
        )}
      </div>

      {isOwner && (
        <InviteStaffDialog
          open={inviteDialogOpen}
          onClose={() => {
            setInviteDialogOpen(false);
          }}
        />
      )}
    </>
  );
}
