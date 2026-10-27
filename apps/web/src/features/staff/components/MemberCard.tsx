import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { formatRelative } from '@/lib/date';
import { fullName } from '@/lib/names';
import type { User } from '@/types/models';
import { STAFF_ACTION_LABELS, availableStaffActions, type StaffAction } from '../staff-actions';
import { RoleBadge } from './StaffBadges';

interface MemberCardProps {
  member: User;
  isSelf: boolean;
  /** Owners get the ⋯ menu for role and status changes. */
  canManage: boolean;
  onAction: (action: StaffAction) => void;
}

/** A team member as a card; the whole card opens their page (services, hours, time off). */
export function MemberCard({ member, isSelf, canManage, onAction }: MemberCardProps) {
  const name = fullName(member);
  const disabled = member.status === 'disabled';

  return (
    <li className="group relative flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className={cn(disabled && 'opacity-50 grayscale')}>
        <Avatar name={name} size="md" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          {/* The link covers the whole card (after:inset-0); the menu sits above it. */}
          <Link
            to={paths.staffMember(member.id)}
            className="truncate font-medium text-slate-900 after:absolute after:inset-0 after:rounded-xl hover:text-brand-700 focus-visible:outline-none group-focus-within:text-brand-700"
          >
            {name}
          </Link>
          {isSelf && <Badge>You</Badge>}
        </p>
        <p className="truncate text-sm text-slate-500">{member.email}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <RoleBadge role={member.role} />
          {disabled ? (
            <Badge tone="danger">Disabled</Badge>
          ) : (
            <span>{member.last_login_at ? `Active ${formatRelative(member.last_login_at)}` : 'Never signed in'}</span>
          )}
        </div>
      </div>

      {canManage && (
        <div className="relative z-10">
          <ActionMenu
            label={`More actions for ${name}`}
            items={availableStaffActions(member, isSelf).map((action) => ({
              label: STAFF_ACTION_LABELS[action],
              danger: action === 'disable',
              onSelect: () => onAction(action),
            }))}
          />
        </div>
      )}
    </li>
  );
}
