import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCurrentUser } from '@/features/auth/context/use-auth';
import { TimeOffCard } from '@/features/schedules/components/TimeOffCard';
import { WorkingHoursCard } from '@/features/schedules/components/WorkingHoursCard';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { ProfileCard } from '../components/ProfileCard';
import { SessionsCard } from '../components/SessionsCard';

/** Must match the hash in paths.myWorkingHours. */
const WORKING_HOURS_HASH = '#working-hours';

export function AccountPage() {
  useDocumentTitle('Account');
  const { user, business, isOwner } = useCurrentUser();
  const location = useLocation();
  const workingHoursRef = useRef<HTMLDivElement>(null);

  // Router navigation doesn't scroll to a #hash the way a full page load does.
  useEffect(() => {
    if (location.hash === WORKING_HOURS_HASH) {
      workingHoursRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  return (
    <>
      <PageHeader
        title="Account"
        description="Your profile, when you can be booked, and the devices you're signed in on."
      />
      <div className="space-y-6">
        <ProfileCard user={user} businessName={business.name} />
        {/* Same cards as on your staff page; editing follows the same owner-only rule. */}
        <div id={WORKING_HOURS_HASH.slice(1)} ref={workingHoursRef} className="scroll-mt-20">
          <WorkingHoursCard userId={user.id} canEdit={isOwner} />
        </div>
        <TimeOffCard userId={user.id} canEdit={isOwner} />
        <SessionsCard />
      </div>
    </>
  );
}
