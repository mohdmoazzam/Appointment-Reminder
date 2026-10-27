import { Avatar } from '@/components/ui/Avatar';
import { countryName } from '@/lib/countries';
import { BUSINESS_TYPE_LABELS } from '@/types/enums';
import type { PublicBusiness } from '../types';

/** The business's name, logo and contact details at the top of the booking page. */
export function BusinessHeader({ business }: { business: PublicBusiness }) {
  const address = [
    business.address_line1,
    business.address_line2,
    business.city,
    business.state,
    business.postal_code,
    business.country ? (countryName(business.country) ?? business.country) : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <header className="flex items-center gap-4">
      <Avatar name={business.name} imageUrl={business.logo_url} size="lg" shape="rounded" />
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{business.name}</h1>
        <p className="text-sm text-slate-500">{BUSINESS_TYPE_LABELS[business.type]}</p>
        {address && <p className="mt-1 text-sm text-slate-600">{address}</p>}
        {business.phone && (
          <a href={`tel:${business.phone}`} className="text-sm text-brand-600 hover:text-brand-700">
            {business.phone}
          </a>
        )}
      </div>
    </header>
  );
}
