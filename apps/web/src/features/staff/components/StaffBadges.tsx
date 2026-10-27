import { Badge } from '@/components/ui/Badge';
import { USER_ROLE_LABELS, type UserRole } from '@/types/enums';

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge tone={role === 'owner' ? 'brand' : 'neutral'}>{USER_ROLE_LABELS[role]}</Badge>;
}
