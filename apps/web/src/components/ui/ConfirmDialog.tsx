import type { ReactNode } from 'react';
import { Button } from './Button';
import { Dialog, DialogActions } from './Dialog';
import { ErrorAlert } from './ErrorAlert';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  /** "danger" for destructive actions (red confirm button). */
  tone?: 'primary' | 'danger';
  /** True while the confirmed action is running. */
  isPending?: boolean;
  /** Error from the confirmed action, shown inside the dialog. */
  error?: unknown;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asks "are you sure?" before an action. The parent runs the action in onConfirm. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = 'primary',
  isPending = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} title={title}>
      <div className="text-sm text-slate-600">{message}</div>
      <ErrorAlert error={error} className="mt-4" />
      <DialogActions>
        <Button variant="secondary" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          isLoading={isPending}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
