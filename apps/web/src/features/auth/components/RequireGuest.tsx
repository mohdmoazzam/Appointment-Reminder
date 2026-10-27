import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageSpinner } from '@/components/ui/QueryStatus';
import { useAuth } from '../context/use-auth';
import { redirectTargetAfterLogin } from '../redirect';
import { SessionErrorScreen } from './SessionErrorScreen';

/**
 * Layout route for login and signup. Once the user is signed in (already, or by submitting one
 * of those forms) it sends them on to the page they came for.
 */
export function RequireGuest() {
  const { status, error, retry, signOut } = useAuth();
  const location = useLocation();

  switch (status) {
    case 'loading':
      return <FullPageSpinner />;
    case 'error':
      return <SessionErrorScreen error={error} onRetry={retry} onSignOut={() => void signOut()} />;
    case 'signed-in':
      return <Navigate to={redirectTargetAfterLogin(location.state)} replace />;
    case 'signed-out':
      return <Outlet />;
  }
}
