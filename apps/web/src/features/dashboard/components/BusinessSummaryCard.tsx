import type { ReactNode } from 'react';
import { paths } from '@/app/paths';
import { Avatar } from '@/components/ui/Avatar';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { countryName } from '@/lib/countries';
import { BUSINESS_TYPE_LABELS } from '@/types/enums';
import type { Business } from '@/types/models';

/** "12 MG Road, Bengaluru, Karnataka 560001, India", or null if no address was entered. */
function formatAddress(business: Business): string | null {
  const cityLine = [business.city, [business.state, business.postal_code].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  const parts = [
    business.address_line1,
    business.address_line2,
    cityLine,
    business.country ? (countryName(business.country) ?? business.country) : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export function BusinessSummaryCard({ business }: { business: Business }) {
  return (
    <Card>
      <CardHeader
        title="Your business"
        actions={
          <ButtonLink to={paths.businessSettings} variant="secondary" size="sm">
            View settings
          </ButtonLink>
        }
      />
      <CardBody>
        <div className="flex items-center gap-4">
          <Avatar name={business.name} imageUrl={business.logo_url} size="md" shape="rounded" />
          <div>
            <p className="font-medium text-slate-900">{business.name}</p>
            <p className="text-sm text-slate-500">{BUSINESS_TYPE_LABELS[business.type]}</p>
          </div>
        </div>
        <dl className="mt-5 space-y-3 text-sm">
          <SummaryRow label="Time zone">{business.timezone.replaceAll('_', ' ')}</SummaryRow>
          <SummaryRow label="Phone">{business.phone ?? <NotSet />}</SummaryRow>
          <SummaryRow label="Address">{formatAddress(business) ?? <NotSet />}</SummaryRow>
        </dl>
      </CardBody>
    </Card>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900">{children}</dd>
    </div>
  );
}

function NotSet() {
  return <span className="text-slate-400">Not set</span>;
}
