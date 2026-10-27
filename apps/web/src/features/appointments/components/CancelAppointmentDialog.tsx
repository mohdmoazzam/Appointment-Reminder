import { useId, useState } from 'react';
import { useToast } from '@/components/toast/use-toast';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { controlStyles } from '@/components/ui/field-styles';
import { formatTimeInZone } from '@/lib/date';
import { fullName } from '@/lib/names';
import type { Appointment } from '@/types/models';
import { useUpdateAppointmentStatus } from '../queries';

const MAX_REASON_LENGTH = 500;

interface CancelAppointmentDialogProps {
  /** The appointment to cancel, or null when closed. */
  appointment: Appointment | null;
  onClose: () => void;
  timeZone: string;
}

export function CancelAppointmentDialog({
  appointment,
  onClose,
  timeZone,
}: CancelAppointmentDialogProps) {
  return (
    <Dialog
      open={appointment !== null}
      onClose={onClose}
      title="Cancel appointment?"
      description={
        appointment &&
        `${appointment.service.name} for ${fullName(appointment.customer)} at ${formatTimeInZone(appointment.starts_at, timeZone)}. The time becomes free for others to book.`
      }
    >
      {appointment && <CancelForm appointment={appointment} onDone={onClose} />}
    </Dialog>
  );
}

function CancelForm({ appointment, onDone }: { appointment: Appointment; onDone: () => void }) {
  const toast = useToast();
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const cancelMutation = useUpdateAppointmentStatus();

  const cancel = () =>
    cancelMutation.mutate(
      {
        appointmentId: appointment.id,
        request: { status: 'cancelled', cancellation_reason: reason.trim() || undefined },
      },
      {
        onSuccess: () => {
          toast.success('Appointment cancelled');
          onDone();
        },
      },
    );

  return (
    <div className="space-y-4">
      <ErrorAlert error={cancelMutation.error} />
      <div className="space-y-1.5">
        <label htmlFor={reasonId} className="block text-sm font-medium text-slate-700">
          Reason <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id={reasonId}
          rows={2}
          maxLength={MAX_REASON_LENGTH}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Customer asked to cancel"
          className={controlStyles(false)}
        />
      </div>
      <DialogActions>
        <Button variant="secondary" onClick={onDone} disabled={cancelMutation.isPending}>
          Keep appointment
        </Button>
        <Button variant="danger" onClick={cancel} isLoading={cancelMutation.isPending}>
          Cancel appointment
        </Button>
      </DialogActions>
    </div>
  );
}
