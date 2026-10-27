import { Link, Navigate, useParams } from 'react-router';
import { paths } from '@/app/paths';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { ErrorBlock, FullPageSpinner, LoadingBlock } from '@/components/ui/QueryStatus';
import { isApiErrorWithStatus } from '@/lib/api/api-error';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { fullName } from '@/lib/names';
import { AcceptInviteForm } from '../components/AcceptInviteForm';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../context/use-auth';
import { useAcceptInvite, useInvitePreview } from '../queries';

/**
 * Opened from the link an owner shares (`/invite/:token`). Not behind RequireGuest: someone who
 * is already signed in is asked to sign out first instead of being redirected away.
 */
export function AcceptInvitePage() {
  useDocumentTitle('Accept invite');
  const { token = '' } = useParams<{ token: string }>();
  const { status, currentUser, signOut } = useAuth();
  const inviteQuery = useInvitePreview(token);
  const acceptMutation = useAcceptInvite(token);

  // Accepting signs the new user in, so the checks below must not mistake them for someone
  // who was already signed in when they opened the link.
  if (acceptMutation.isSuccess) return <Navigate to={paths.dashboard} replace />;
  if (status === 'loading') return <FullPageSpinner />;

  if (inviteQuery.isPending) {
    return (
      <AuthLayout title="Accept invite">
        <LoadingBlock label="Checking your invite" />
      </AuthLayout>
    );
  }

  if (inviteQuery.isError) {
    // 410 Gone: unknown token, already accepted, revoked or expired.
    if (isApiErrorWithStatus(inviteQuery.error, 410)) {
      return (
        <AuthLayout
          title="This invite can't be used"
          description="The link is invalid, has expired, or was already used. Ask the business owner to send you a new invite."
        >
          <ButtonLink to={paths.login} variant="secondary" className="w-full">
            Go to sign in
          </ButtonLink>
        </AuthLayout>
      );
    }
    return (
      <AuthLayout title="Accept invite">
        <ErrorBlock
          error={inviteQuery.error}
          onRetry={() => void inviteQuery.refetch()}
          isRetrying={inviteQuery.isFetching}
        />
      </AuthLayout>
    );
  }

  const invite = inviteQuery.data;
  const signedInAsSomeoneElse = status === 'signed-in' && currentUser && !acceptMutation.isPending;

  if (signedInAsSomeoneElse) {
    return (
      <AuthLayout title={`Join ${invite.business.name}`}>
        <Alert tone="warning" title={`You're signed in as ${fullName(currentUser.user)}`}>
          This invite is for <strong>{invite.email}</strong>. Sign out first to accept it with a new
          account.
        </Alert>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Link
            to={paths.dashboard}
            className="self-center text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Back to dashboard
          </Link>
          <Button onClick={() => void signOut()}>Sign out</Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={`Join ${invite.business.name}`}
      description="You've been invited to the team. Set a password to create your account."
    >
      <AcceptInviteForm
        invite={invite}
        onSubmit={(request) => acceptMutation.mutate(request)}
        isSubmitting={acceptMutation.isPending}
        submitError={acceptMutation.error}
      />
    </AuthLayout>
  );
}
