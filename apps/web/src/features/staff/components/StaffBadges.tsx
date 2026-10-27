import { Badge } from '@/components/ui/Badge';
import {
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  type UserRole,
  type UserStatus,
} from '@/types/enums';

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge tone={role === 'owner' ? 'brand' : 'neutral'}>{USER_ROLE_LABELS[role]}</Badge>;
}

export function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge tone={status === 'active' ? 'success' : 'danger'}>{USER_STATUS_LABELS[status]}</Badge>
  );
}
