import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { Card, CardHeader } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
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

/** Getting-started steps. Hidden once everything is done. */
export function SetupChecklist(props: SetupChecklistProps) {
  const items = buildChecklist(props);
  const doneCount = items.filter((item) => item.done).length;
  if (doneCount === items.length) return null;

  return (
    <Card>
      <CardHeader
        title="Finish setting up"
        description={`${doneCount} of ${items.length} steps done`}
      />
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-5 py-3 text-sm">
            <CheckIcon done={item.done} />
            {!item.done && props.canEdit ? (
              <Link to={item.to} className="font-medium text-brand-600 hover:text-brand-700">
                {item.label}
              </Link>
            ) : (
              <span className={cn(item.done ? 'text-slate-400 line-through' : 'text-slate-700')}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CheckIcon({ done }: { done: boolean }) {
  return (
    <span
      aria-label={done ? 'Done' : 'To do'}
      className={cn(
        'inline-flex size-5 shrink-0 items-center justify-center rounded-full border',
        done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white',
      )}
    >
      {done && (
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </span>
  );
}
