import { useToast } from '@/components/toast/use-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useUpdateStaff } from '../queries';
import { describeStaffAction, staffActionRequest, type PendingStaffAction } from '../staff-actions';

interface StaffActionDialogProps {
  /** The change waiting for confirmation, or null when closed. */
  pending: PendingStaffAction | null;
  currentUserId: string;
  onClose: () => void;
}

/**
 * Confirms and applies a role or status change (make owner/staff, disable/enable). Used by the
 * team list and the member's own page so both behave the same.
 */
export function StaffActionDialog({ pending, currentUserId, onClose }: StaffActionDialogProps) {
  const toast = useToast();
  const updateMutation = useUpdateStaff();
  const copy = pending ? describeStaffAction(pending, pending.member.id === currentUserId) : null;

  const close = () => {
    updateMutation.reset();
    onClose();
  };

  const confirm = () => {
    if (!pending || !copy) return;
    updateMutation.mutate(
      { userId: pending.member.id, request: staffActionRequest(pending.action) },
      {
        onSuccess: () => {
          toast.success(copy.successMessage);
          close();
        },
      },
    );
  };

  return (
    <ConfirmDialog
      open={pending !== null}
      title={copy?.title ?? ''}
      message={copy?.message}
      confirmLabel={copy?.confirmLabel ?? 'Confirm'}
      tone={copy?.tone}
      isPending={updateMutation.isPending}
      error={updateMutation.error}
      onConfirm={confirm}
      onCancel={close}
    />
  );
}
