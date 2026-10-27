import { CopyField } from '@/components/ui/CopyField';
import { formatDateTime } from '@/lib/date';
import { fullName } from '@/lib/names';
import type { CreatedInvite } from '../types';

/**
 * Shows a freshly created invite link. There's no email service yet, so the owner sends it
 * themselves; the link can't be shown again later because the API only keeps its hash.
 */
export function InviteLinkResult({ invite }: { invite: CreatedInvite }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Send this link to <strong>{fullName(invite)}</strong> ({invite.email}). It works once and
        expires on {formatDateTime(invite.expires_at)}.
      </p>
      <CopyField label="Invite link" value={invite.invite_url} />
      <p className="text-xs text-slate-500">
        Copy it now: for security the link can&apos;t be shown again. If it gets lost, create a new
        link from the pending invites list.
      </p>
    </div>
  );
}
