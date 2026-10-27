import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import { countryName } from '@/lib/countries';
import { BUSINESS_TYPE_LABELS } from '@/types/enums';
import type { PublicBusiness } from '../types';

/**
 * The business at the top of the booking page: cover, logo, name, address and a call button.
 * Phones get an edge-to-edge banner; wider screens a card as wide as the booking flow below.
 * With a cover, the photo is its own banner and the details sit on white below it, so the
 * business's own colours lead; without one, the details sit on the brand gradient.
 */
export function BookingHero({ business }: { business: PublicBusiness }) {
  const hasCover = Boolean(business.cover_url);
  const address = [business.address_line1, business.city, business.country ? (countryName(business.country) ?? business.country) : null]
    .filter(Boolean)
    .join(', ');

  return (
    <header className="mx-auto max-w-5xl sm:px-6 sm:pt-6">
      <div
        className={cn(
          'overflow-hidden sm:rounded-2xl sm:shadow-sm',
          hasCover ? 'border-b border-slate-200 bg-white sm:border' : 'bg-gradient-to-br from-brand-600 to-brand-700 text-white',
        )}
      >
        {business.cover_url && (
          // 3:1 on phones keeps a wide banner mostly in view; 4:1 (the suggested 1600 × 400) on wider screens.
          <div className="aspect-[3/1] w-full bg-slate-100 sm:aspect-[4/1]">
            <img src={business.cover_url} alt="" className="size-full object-cover" />
          </div>
        )}
        <div
          className={cn(
            'flex flex-col gap-5 px-4 sm:flex-row sm:px-8',
            hasCover ? 'pb-6 sm:items-end sm:pb-8' : 'py-6 sm:items-center sm:py-10',
          )}
        >
          {/* Phones: with a cover the logo overlaps it above the name; without, beside it. Wider: one row. */}
          <div className={cn('flex min-w-0 flex-1 gap-4 sm:flex-row sm:gap-5', hasCover ? 'flex-col sm:items-start' : 'items-center')}>
            <div
              className={cn(
                'shrink-0 rounded-2xl bg-white p-1 shadow-md',
                hasCover && '-mt-10 self-start ring-1 ring-slate-200 sm:-mt-14 sm:self-auto',
              )}
            >
              <Avatar name={business.name} imageUrl={business.logo_url} size="lg" shape="rounded" />
            </div>
            <div className={cn('min-w-0', hasCover && 'sm:pt-4')}>
              <p
                className={cn(
                  'text-xs font-medium tracking-wide uppercase sm:text-sm sm:tracking-normal sm:normal-case',
                  hasCover ? 'text-brand-700' : 'text-brand-100',
                )}
              >
                {BUSINESS_TYPE_LABELS[business.type]}
              </p>
              <h1
                className={cn('text-xl leading-tight font-semibold tracking-tight break-words sm:text-3xl', hasCover && 'text-slate-900')}
              >
                {business.name}
              </h1>
              {address && <p className={cn('mt-1 line-clamp-2 text-sm', hasCover ? 'text-slate-500' : 'text-brand-100')}>{address}</p>}
            </div>
          </div>
          {business.phone && (
            <a
              href={`tel:${business.phone}`}
              className={cn(
                'inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors sm:w-auto sm:py-2',
                hasCover
                  ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                  : 'bg-white/15 text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25',
              )}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
                <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.15a1.5 1.5 0 0 1 1.46 1.15l.6 2.4a1.5 1.5 0 0 1-.6 1.6l-.94.62a11.1 11.1 0 0 0 5.06 5.06l.62-.94a1.5 1.5 0 0 1 1.6-.6l2.4.6A1.5 1.5 0 0 1 18 15.35v1.15a1.5 1.5 0 0 1-1.5 1.5H15C8.1 18 2 11.9 2 5V3.5Z" />
              </svg>
              Call {business.phone}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
