import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './auth-context';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

/**
 * The signed-in user and their business, for components rendered behind <RequireAuth>
 * (which guarantees they are loaded).
 */
export function useCurrentUser() {
  const { currentUser } = useAuth();
  if (!currentUser) {
    throw new Error('useCurrentUser must be used inside a route wrapped in <RequireAuth>');
  }
  return {
    user: currentUser.user,
    business: currentUser.business,
    isOwner: currentUser.user.role === 'owner',
  };
}
