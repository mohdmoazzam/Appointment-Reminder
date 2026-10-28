import { useState } from 'react';
import { paths } from '@/app/paths';
import {
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  UsersIcon,
  WalletIcon,
} from '@/components/layout/icons';
import { Button } from '@/components/ui/Button';
import { useCurrentUser } from '@/features/auth/context/use-auth';
import { NewAppointmentDialog } from '@/features/appointments/components/NewAppointmentDialog';
import { useAppointments } from '@/features/appointments/queries';
import { useWorkingHours } from '@/features/schedules/queries';
import { useServices } from '@/features/services/queries';
import { useStaffInvites, useStaffMembers } from '@/features/staff/queries';
import {
  addDaysToDate,
  formatLongDate,
  formatTimeInZone,
  greetingForNow,
  isPast,
  todayInTimeZone,
} from '@/lib/date';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { formatPrice } from '@/lib/money';
import type { Appointment } from '@/types/models';
import { BusinessSummaryCard } from '../components/BusinessSummaryCard';
import { SetupChecklist } from '../components/SetupChecklist';
import { StatCard } from '../components/StatCard';
import { TodaySchedule } from '../components/TodaySchedule';

/** Only the totals are needed, so one row per list is enough. */
const COUNT_ONLY = { page: 1, take: 1 } as const;
/** Enough for a busy day; the Appointments page has the rest. */
const TODAY_PAGE_SIZE = 50;

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user, business, isOwner } = useCurrentUser();
  const timeZone = business.timezone;
  const today = todayInTimeZone(timeZone);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const membersQuery = useStaffMembers(COUNT_ONLY);
  const invitesQuery = useStaffInvites(COUNT_ONLY);
  const servicesQuery = useServices(COUNT_ONLY);
  const workingHoursQuery = useWorkingHours(user.id);
  const todayQuery = useAppointments({
    date_from: today,
    date_to: today,
    exclude_cancelled: true,
    order: 'asc',
    page: 1,
    take: TODAY_PAGE_SIZE,
  });
  const weekQuery = useAppointments({
    ...COUNT_ONLY,
    date_from: today,
    date_to: addDaysToDate(today, 6),
    exclude_cancelled: true,
  });

  const teamSize = membersQuery.data?.meta.count;
  const pendingInvites = invitesQuery.data?.meta.count;
  const serviceCount = servicesQuery.data?.meta.count;
  const hasWorkingHours = workingHoursQuery.data ? workingHoursQuery.data.length > 0 : undefined;

  const todays = todayQuery.data?.data ?? [];
  const todayTotal = todayQuery.data?.meta.count;
  /** Only meaningful when the whole day is loaded. */
  const hasWholeDay = todayTotal !== undefined && todays.length === todayTotal;
  const nextAppointment = todays.find(
    (appointment) =>
      (appointment.status === 'booked' || appointment.status === 'confirmed') &&
      !isPast(appointment.starts_at),
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{formatLongDate(today)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {greetingForNow()}, {user.first_name}
          </h1>
        </div>
        <Button onClick={() => setNewDialogOpen(true)}>
          <PlusIcon className="size-4" />
          New appointment
        </Button>
      </div>

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

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Today"
            icon={CalendarIcon}
            value={todayTotal}
            isError={todayQuery.isError}
            hint={
              nextAppointment
                ? `Next at ${formatTimeInZone(nextAppointment.starts_at, timeZone)}`
                : todayTotal
                  ? 'No more today'
                  : undefined
            }
            to={paths.appointments}
          />
          <StatCard
            label="Next 7 days"
            icon={ClockIcon}
            value={weekQuery.data?.meta.count}
            isError={weekQuery.isError}
            hint="Including today"
            to={paths.appointments}
          />
          <StatCard
            label="Expected today"
            icon={WalletIcon}
            value={
              hasWholeDay ? formatPrice(expectedRevenue(todays), business.currency) : undefined
            }
            isError={todayQuery.isError || (todayTotal !== undefined && !hasWholeDay)}
            hint="Excludes cancellations"
          />
          <StatCard
            label="Team"
            icon={UsersIcon}
            value={teamSize}
            isError={membersQuery.isError}
            hint={
              pendingInvites
                ? `${pendingInvites} pending ${pendingInvites === 1 ? 'invite' : 'invites'}`
                : undefined
            }
            to={pendingInvites ? paths.staffInvites : paths.staff}
          />
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <TodaySchedule
              appointments={todays}
              total={todayTotal ?? 0}
              isPending={todayQuery.isPending}
              error={todayQuery.isError ? todayQuery.error : null}
              onRetry={() => void todayQuery.refetch()}
              isRetrying={todayQuery.isFetching}
              timeZone={timeZone}
              onBook={() => setNewDialogOpen(true)}
            />
          </div>
          <BusinessSummaryCard business={business} />
        </div>
      </div>

      <NewAppointmentDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        date={today}
        today={today}
        timeZone={timeZone}
        currency={business.currency}
      />
    </>
  );
}

/** Takings if every remaining booking is honoured: no-shows don't pay. */
function expectedRevenue(appointments: Appointment[]): string {
  const total = appointments
    .filter((appointment) => appointment.status !== 'no_show')
    .reduce((sum, appointment) => sum + Number(appointment.price), 0);
  return total.toFixed(2);
}
