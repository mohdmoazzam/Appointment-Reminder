import { Badge } from '@/components/ui/Badge';
import { APPOINTMENT_STATUS_LABELS, type AppointmentStatus } from '@/types/enums';
import { STATUS_BADGE_TONES } from '../status';

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge tone={STATUS_BADGE_TONES[status]}>{APPOINTMENT_STATUS_LABELS[status]}</Badge>;
}
