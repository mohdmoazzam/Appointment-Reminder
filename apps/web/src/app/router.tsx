import { createBrowserRouter } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { FullPageSpinner } from '@/components/ui/QueryStatus';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { RequireGuest } from '@/features/auth/components/RequireGuest';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';
import { paths, routePatterns } from './paths';

/*
 * Route tree. Pages are lazy-loaded, so each one is a separate chunk downloaded the first time
 * it is visited. Layout routes (no path) wrap their children:
 *   RequireGuest – login/signup, only when signed out
 *   RequireAuth  – everything else, only when signed in; AppLayout adds the sidebar
 */
export const router = createBrowserRouter([
  {
    ErrorBoundary: RouteErrorPage,
    // Shown while the first page's chunk downloads.
    HydrateFallback: FullPageSpinner,
    children: [
      {
        Component: RequireGuest,
        children: [
          {
            path: paths.login,
            lazy: async () => ({
              Component: (await import('@/features/auth/pages/LoginPage')).LoginPage,
            }),
          },
          {
            path: paths.signup,
            lazy: async () => ({
              Component: (await import('@/features/auth/pages/SignupPage')).SignupPage,
            }),
          },
        ],
      },
      {
        path: routePatterns.acceptInvite,
        lazy: async () => ({
          Component: (await import('@/features/auth/pages/AcceptInvitePage')).AcceptInvitePage,
        }),
      },
      {
        // Public: customers book here without an account, signed in or not.
        path: routePatterns.publicBooking,
        lazy: async () => ({
          Component: (await import('@/features/booking/pages/PublicBookingPage')).PublicBookingPage,
        }),
      },
      {
        Component: RequireAuth,
        children: [
          {
            Component: AppLayout,
            children: [
              {
                path: paths.dashboard,
                lazy: async () => ({
                  Component: (await import('@/features/dashboard/pages/DashboardPage'))
                    .DashboardPage,
                }),
              },
              {
                path: paths.appointments,
                lazy: async () => ({
                  Component: (await import('@/features/appointments/pages/AppointmentsPage'))
                    .AppointmentsPage,
                }),
              },
              {
                path: paths.staff,
                lazy: async () => ({
                  Component: (await import('@/features/staff/pages/StaffPage')).StaffPage,
                }),
              },
              {
                path: routePatterns.staffMember,
                lazy: async () => ({
                  Component: (await import('@/features/staff/pages/StaffMemberPage'))
                    .StaffMemberPage,
                }),
              },
              {
                path: paths.services,
                lazy: async () => ({
                  Component: (await import('@/features/services/pages/ServicesPage')).ServicesPage,
                }),
              },
              {
                path: paths.businessSettings,
                lazy: async () => ({
                  Component: (await import('@/features/business/pages/BusinessSettingsPage'))
                    .BusinessSettingsPage,
                }),
              },
              {
                path: paths.account,
                lazy: async () => ({
                  Component: (await import('@/features/users/pages/AccountPage')).AccountPage,
                }),
              },
            ],
          },
        ],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
