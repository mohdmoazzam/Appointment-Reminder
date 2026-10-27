import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCurrentUser } from '@/features/auth/context/use-auth';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { InviteStaffDialog } from '../components/InviteStaffDialog';
import { PendingInvitesCard } from '../components/PendingInvitesCard';
import { TeamMembersCard } from '../components/TeamMembersCard';

export function StaffPage() {
  useDocumentTitle('Staff');
  const { user, isOwner } = useCurrentUser();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Staff"
        description={
          isOwner
            ? 'Invite your team, change roles and disable accounts.'
            : 'The people who work at your business.'
        }
        actions={isOwner && <Button onClick={() => setInviteDialogOpen(true)}>Invite staff</Button>}
      />

      <div className="space-y-6">
        <TeamMembersCard currentUserId={user.id} canManage={isOwner} />
        <PendingInvitesCard canManage={isOwner} />
      </div>

      {isOwner && (
        <InviteStaffDialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} />
      )}
    </>
  );
}
