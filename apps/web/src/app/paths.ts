/** Every URL in the app. Link to these instead of writing paths inline. */
export const paths = {
  dashboard: '/',
  appointments: '/appointments',
  /** The business's public, shareable booking page. */
  publicBooking: (slug: string) => `/book/${encodeURIComponent(slug)}`,
  staff: '/staff',
  /** The Staff page with the "Pending invites" tab open. */
  staffInvites: '/staff?tab=invites',
  staffMember: (userId: string) => `/staff/${encodeURIComponent(userId)}`,
  services: '/services',
  notifications: '/notifications',
  businessSettings: '/settings/business',
  /** Business settings with the "Holidays & closures" tab open. */
  businessClosures: '/settings/business?tab=closures',
  account: '/account',
  /** Where you're signed in, with sign-out per device or everywhere. */
  devices: '/account/devices',
  /** The account page, scrolled to your working hours. */
  myWorkingHours: '/account#working-hours',
  login: '/login',
  signup: '/signup',
  /** Must match the link the API builds: `${APP_URL}/invite/${token}`. */
  acceptInvite: (token: string) => `/invite/${encodeURIComponent(token)}`,
} as const;

/** Route patterns for paths that take parameters. */
export const routePatterns = {
  acceptInvite: '/invite/:token',
  staffMember: '/staff/:userId',
  publicBooking: '/book/:slug',
} as const;
