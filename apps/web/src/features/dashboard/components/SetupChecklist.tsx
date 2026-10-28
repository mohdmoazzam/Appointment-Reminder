import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { ChevronRightIcon } from '@/components/layout/icons';
import { Card } from '@/components/ui/Card';
import type { Business } from '@/types/models';

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  to: string;
}

interface SetupChecklistProps {
  business: Business;
  /** Members and pending invites, used for the "invite your team" step. */
  teamSize: number;
  pendingInvites: number;
  /** Number of services, active or not. */
  serviceCount: number;
  /** Whether the signed-in user has any regular working hours. */
  hasWorkingHours: boolean;
  /** Only owners can complete the steps, so only they get links. */
  canEdit: boolean;
}

function buildChecklist({
  business,
  teamSize,
  pendingInvites,
  serviceCount,
  hasWorkingHours,
}: SetupChecklistProps): ChecklistItem[] {
  return [
    {
      id: 'account',
      label: 'Create your business account',
      done: true,
      to: paths.businessSettings,
    },
    {
      id: 'logo',
      label: 'Upload your logo',
      done: business.logo_url !== null,
      to: paths.businessSettings,
    },
    {
      id: 'address',
      label: 'Add your address',
      done: Boolean(business.address_line1 && business.city),
      to: paths.businessSettings,
    },
    {
      id: 'phone',
      label: 'Add a contact phone number',
      done: business.phone !== null,
      to: paths.businessSettings,
    },
    {
      id: 'services',
      label: 'Add the services you offer',
      done: serviceCount > 0,
      to: paths.services,
    },
    {
      id: 'working-hours',
      label: 'Set your working hours',
      done: hasWorkingHours,
      to: paths.myWorkingHours,
    },
    {
      id: 'team',
      label: 'Invite your team',
      done: teamSize > 1 || pendingInvites > 0,
      to: paths.staff,
    },
  ];
}

/** Getting-started steps still to do, with overall progress. Hidden once everything is done. */
export function SetupChecklist(props: SetupChecklistProps) {
  const items = buildChecklist(props);
  const doneCount = items.filter((item) => item.done).length;
  if (doneCount === items.length) return null;

  const remaining = items.filter((item) => !item.done);
  const percent = Math.round((doneCount / items.length) * 100);

  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Finish setting up</h2>
          <p className="text-sm text-slate-500 tabular-nums">
            {doneCount} of {items.length} done
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {remaining.map((item) => (
          <li key={item.id}>
            {props.canEdit ? (
              <Link
                to={item.to}
                className="group flex items-center gap-3 px-5 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <StepDot />
                <span className="flex-1">{item.label}</span>
                <ChevronRightIcon className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600" />
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-5 py-3 text-sm text-slate-700">
                <StepDot />
                {item.label}
              </div>
            )}
          </li>
        ))}
      </ul>
      {!props.canEdit && (
        <p className="border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-xs text-slate-500">
          The business owner can complete these steps.
        </p>
      )}
    </Card>
  );
}

function StepDot() {
  return (
    <span
      aria-hidden="true"
      className="size-4 shrink-0 rounded-full border-2 border-slate-300 bg-white"
    />
  );
}
