import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogActions } from '@/components/ui/Dialog';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { isApiErrorWithStatus } from '@/lib/api/api-error';
import { USER_ROLE_OPTIONS } from '@/lib/options';
import { useCreateInvite } from '../queries';
import { inviteSchema, toCreateInviteRequest, type InviteFormValues } from '../schemas';
import { InviteLinkResult } from './InviteLinkResult';

interface InviteStaffDialogProps {
  open: boolean;
  onClose: () => void;
}

export function InviteStaffDialog({ open, onClose }: InviteStaffDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Invite a team member"
      description="We'll email them an invite link; they set their own password when they open it."
    >
      {/* Mounted only while open, so the form and its result start fresh each time. */}
      <InviteStaffForm onDone={onClose} />
    </Dialog>
  );
}

function InviteStaffForm({ onDone }: { onDone: () => void }) {
  const createMutation = useCreateInvite();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', first_name: '', last_name: '', role: 'staff' },
  });

  if (createMutation.isSuccess) {
    return (
      <>
        <InviteLinkResult invite={createMutation.data} />
        <DialogActions>
          <Button onClick={onDone}>Done</Button>
        </DialogActions>
      </>
    );
  }

  const onSubmit = handleSubmit((values) =>
    createMutation.mutate(toCreateInviteRequest(values), {
      onError: (error) => {
        // 409: someone already has an account with this email.
        if (isApiErrorWithStatus(error, 409)) setError('email', { message: error.message });
      },
    }),
  );

  const formError = isApiErrorWithStatus(createMutation.error, 409) ? null : createMutation.error;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <ErrorAlert error={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="First name" autoFocus error={errors.first_name?.message} {...register('first_name')} />
        <TextField label="Last name" error={errors.last_name?.message} {...register('last_name')} />
      </div>
      <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
      <SelectField
        label="Role"
        options={USER_ROLE_OPTIONS}
        hint="Owners can edit the business and manage staff. Staff can't."
        error={errors.role?.message}
        {...register('role')}
      />
      <DialogActions>
        <Button variant="secondary" onClick={onDone} disabled={createMutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={createMutation.isPending}>
          Send invite
        </Button>
      </DialogActions>
    </form>
  );
}
