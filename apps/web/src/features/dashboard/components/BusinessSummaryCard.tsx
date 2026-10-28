import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { ExternalLinkIcon } from '@/components/layout/icons';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { buttonStyles } from '@/components/ui/button-styles';
import { Card } from '@/components/ui/Card';
import { countryName } from '@/lib/countries';
import { BUSINESS_TYPE_LABELS } from '@/types/enums';
import type { Business } from '@/types/models';

const COPIED_FEEDBACK_MS = 2000;

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

/** The business at a glance, plus its shareable booking link. */
export function BusinessSummaryCard({ business }: { business: Business }) {
  const bookingPath = paths.publicBooking(business.slug);
  const bookingUrl = `${window.location.origin}${bookingPath}`;

  return (
    <Card>
      <div className="flex items-center gap-3 px-5 pt-5">
        <Avatar name={business.name} imageUrl={business.logo_url} size="md" shape="rounded" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{business.name}</p>
          <p className="text-sm text-slate-500">{BUSINESS_TYPE_LABELS[business.type]}</p>
        </div>
        <Link
          to={paths.businessSettings}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Edit
        </Link>
      </div>

      <dl className="space-y-2.5 px-5 py-4 text-sm">
        <SummaryRow label="Time zone">{business.timezone.replaceAll('_', ' ')}</SummaryRow>
        <SummaryRow label="Phone">{business.phone ?? <NotSet />}</SummaryRow>
        <SummaryRow label="Address">{formatAddress(business) ?? <NotSet />}</SummaryRow>
      </dl>

      <div className="border-t border-slate-100 px-5 py-4">
        <p className="text-sm font-medium text-slate-900">Online booking page</p>
        <p className="mt-0.5 text-xs text-slate-500">Share it so customers can book themselves.</p>
        <p className="mt-3 truncate rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600 ring-1 ring-slate-200 ring-inset">
          {bookingUrl}
        </p>
        <div className="mt-3 flex gap-2">
          <CopyButton value={bookingUrl} />
          <a
            href={bookingPath}
            target="_blank"
            rel="noreferrer"
            className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'flex-1' })}
          >
            Open
            <ExternalLinkIcon className="size-4" />
          </a>
        </div>
      </div>
    </Card>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (copyState === 'idle') return;
    const timer = window.setTimeout(() => setCopyState('idle'), COPIED_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState('copied');
    } catch {
      // Clipboard access can be denied (or unavailable over plain http).
      setCopyState('failed');
    }
  };

  return (
    <Button variant="secondary" size="sm" className="flex-1" onClick={copy}>
      {copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? "Couldn't copy" : 'Copy link'}
    </Button>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-900">{children}</dd>
    </div>
  );
}

function NotSet() {
  return <span className="text-slate-400">Not set</span>;
}
