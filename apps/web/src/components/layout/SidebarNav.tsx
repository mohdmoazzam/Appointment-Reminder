import type { ComponentType } from 'react';
import { NavLink } from 'react-router';
import { paths } from '@/app/paths';
import { cn } from '@/lib/cn';
import { BuildingIcon, CalendarIcon, HomeIcon, TagIcon, UserCircleIcon, UsersIcon } from './icons';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Match the path exactly (the dashboard is "/", which every path starts with). */
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: paths.dashboard, label: 'Dashboard', icon: HomeIcon, end: true },
  { to: paths.appointments, label: 'Appointments', icon: CalendarIcon },
  { to: paths.services, label: 'Services', icon: TagIcon },
  { to: paths.staff, label: 'Staff', icon: UsersIcon },
  { to: paths.businessSettings, label: 'Business settings', icon: BuildingIcon },
  { to: paths.account, label: 'Account', icon: UserCircleIcon },
];

interface SidebarNavProps {
  /** Called after a link is clicked, e.g. to close the mobile menu. */
  onNavigate?: () => void;
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  return (
    <nav aria-label="Main" className="space-y-1">
      {NAV_ITEMS.map(({ to, label, icon: ItemIcon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )
          }
        >
          <ItemIcon className="size-5 shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
