import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { RoleBadge } from '@/features/staff/components/StaffBadges';
import { formatDate } from '@/lib/date';
import { fullName } from '@/lib/names';
import type { User } from '@/types/models';

/** Read-only for now: the API has no endpoint to edit your own profile yet. */
export function ProfileCard({ user, businessName }: { user: User; businessName: string }) {
  const name = fullName(user);

  return (
    <Card>
      <CardHeader title="Profile" />
      <CardBody>
        <div className="flex items-center gap-4">
          <Avatar name={name} size="md" />
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{name}</p>
            <p className="truncate text-sm text-slate-500">{user.email}</p>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <ProfileDetail label="Business">{businessName}</ProfileDetail>
          <ProfileDetail label="Role">
            <RoleBadge role={user.role} />
          </ProfileDetail>
          <ProfileDetail label="Member since">{formatDate(user.created_at)}</ProfileDetail>
        </dl>
      </CardBody>
    </Card>
  );
}

function ProfileDetail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children}</dd>
    </div>
  );
}
