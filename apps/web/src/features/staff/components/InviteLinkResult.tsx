import { Alert } from '@/components/ui/Alert';
import { CopyField } from '@/components/ui/CopyField';
import { formatDateTime } from '@/lib/date';
import { fullName } from '@/lib/names';
import type { CreatedInvite } from '../types';

/**
 * A freshly created invite: whether it is being emailed, plus the link to share by hand (e.g. on
 * WhatsApp, or when the email failed). The link can't be shown again later because the API
 * only keeps its hash.
 */
export function InviteLinkResult({ invite }: { invite: CreatedInvite }) {
  const emailing = invite.email_status === 'queued' || invite.email_status === 'sent';
  return (
    <div className="space-y-4">
      {emailing ? (
        <Alert tone="success" title={`Invite on its way to ${invite.email}`}>
          {fullName(invite)} can join using the link in the email. It works once and expires on {formatDateTime(invite.expires_at)}.
        </Alert>
      ) : (
        <Alert tone="warning" title="We couldn't email the invite">
          Send this link to <strong>{fullName(invite)}</strong> ({invite.email}) yourself. It works once and expires on{' '}
          {formatDateTime(invite.expires_at)}.
        </Alert>
      )}
      <CopyField label={emailing ? 'Or share the link directly' : 'Invite link'} value={invite.invite_url} />
      <p className="text-xs text-slate-500">
        For security the link can&apos;t be shown again. If it gets lost, send a new invite from the pending invites list.
      </p>
    </div>
  );
}
