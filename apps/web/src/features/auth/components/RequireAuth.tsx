import { Navigate, Outlet, useLocation } from 'react-router';
import { paths } from '@/app/paths';
import { FullPageSpinner } from '@/components/ui/QueryStatus';
import { useAuth } from '../context/use-auth';
import { loginRedirectState } from '../redirect';
import { SessionErrorScreen } from './SessionErrorScreen';

/** Layout route: renders its children only for a signed-in user, otherwise goes to login. */
export function RequireAuth() {
  const { status, error, retry, signOut } = useAuth();
  const location = useLocation();

  switch (status) {
    case 'loading':
      return <FullPageSpinner />;
    case 'error':
      return <SessionErrorScreen error={error} onRetry={retry} onSignOut={() => void signOut()} />;
    case 'signed-out':
      return <Navigate to={paths.login} replace state={loginRedirectState(location)} />;
    case 'signed-in':
      return <Outlet />;
  }
}
