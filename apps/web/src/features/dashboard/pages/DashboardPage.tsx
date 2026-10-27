import { paths } from '@/app/paths';
import { Alert } from '@/components/ui/Alert';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCurrentUser } from '@/features/auth/context/use-auth';
import { useAppointments } from '@/features/appointments/queries';
import { useWorkingHours } from '@/features/schedules/queries';
import { useServices } from '@/features/services/queries';
import { useStaffInvites, useStaffMembers } from '@/features/staff/queries';
import { greetingForNow, todayInTimeZone } from '@/lib/date';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { BusinessSummaryCard } from '../components/BusinessSummaryCard';
import { SetupChecklist } from '../components/SetupChecklist';
import { StatCard } from '../components/StatCard';

/** Only the totals are needed, so one row per list is enough. */
const COUNT_ONLY = { page: 1, take: 1 } as const;

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user, business, isOwner } = useCurrentUser();
  const membersQuery = useStaffMembers(COUNT_ONLY);
  const invitesQuery = useStaffInvites(COUNT_ONLY);
  const servicesQuery = useServices(COUNT_ONLY);
  const workingHoursQuery = useWorkingHours(user.id);
  const today = todayInTimeZone(business.timezone);
  const todaysAppointmentsQuery = useAppointments({
    ...COUNT_ONLY,
    date_from: today,
    date_to: today,
    exclude_cancelled: true,
  });

  const teamSize = membersQuery.data?.meta.count;
  const pendingInvites = invitesQuery.data?.meta.count;
  const serviceCount = servicesQuery.data?.meta.count;
  const hasWorkingHours = workingHoursQuery.data ? workingHoursQuery.data.length > 0 : undefined;

  return (
    <>
      <PageHeader
        title={`${greetingForNow()}, ${user.first_name}`}
        description={`Here's how ${business.name} is set up.`}
      />

      <div className="space-y-6">
        {teamSize !== undefined &&
          pendingInvites !== undefined &&
          serviceCount !== undefined &&
          hasWorkingHours !== undefined && (
            <SetupChecklist
              business={business}
              teamSize={teamSize}
              pendingInvites={pendingInvites}
              serviceCount={serviceCount}
              hasWorkingHours={hasWorkingHours}
              canEdit={isOwner}
            />
          )}

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Appointments today"
            value={todaysAppointmentsQuery.data?.meta.count}
            isError={todaysAppointmentsQuery.isError}
            link={{ to: paths.appointments, label: 'View schedule' }}
          />
          <StatCard
            label="Team members"
            value={teamSize}
            isError={membersQuery.isError}
            link={{ to: paths.staff, label: 'Manage staff' }}
          />
          <StatCard
            label="Pending invites"
            value={pendingInvites}
            isError={invitesQuery.isError}
            link={{ to: paths.staffInvites, label: 'View invites' }}
          />
        </div>

        <BusinessSummaryCard business={business} />

        <Alert tone="info" title="Coming soon: WhatsApp reminders">
          Booking confirmations and automatic reminders will appear here as they are released.
        </Alert>
      </div>
    </>
  );
}
