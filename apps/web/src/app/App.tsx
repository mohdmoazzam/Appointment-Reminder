import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { ToastProvider } from '@/components/toast/ToastProvider';
import { AuthProvider } from '@/features/auth/context/AuthProvider';
import { queryClient } from '@/lib/query-client';
import { router } from './router';

/**
 * Provider order matters: AuthProvider uses the query client, and the routes use auth and
 * toasts.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
