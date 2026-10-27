import { useState } from 'react';
import { paths } from '@/app/paths';
import { BUSINESS_TYPE_LABELS } from '@/types/enums';
import type { Business } from '@/types/models';
import { CoverEditor } from './CoverEditor';
import { LogoEditor } from './LogoEditor';

const COPIED_FEEDBACK_MS = 2000;

interface BusinessIdentityHeaderProps {
  business: Business;
  canEdit: boolean;
}

/** Cover, logo, name and type, plus the booking link one click away. */
export function BusinessIdentityHeader({ business, canEdit }: BusinessIdentityHeaderProps) {
  const bookingUrl = `${window.location.origin}${paths.publicBooking(business.slug)}`;
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Clipboard can be blocked; the full link is on the Online booking tab to copy by hand.
    }
  };

  return (
    <header className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CoverEditor business={business} canEdit={canEdit} />
      <div className="flex flex-wrap items-start gap-5 p-5 sm:p-6">
        <LogoEditor business={business} canEdit={canEdit} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-brand-700">{BUSINESS_TYPE_LABELS[business.type]}</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">{business.name}</h1>
          <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-50 py-1 pr-1 pl-3 text-sm ring-1 ring-slate-200">
            <span className="truncate text-slate-600">{bookingUrl.replace(/^https?:\/\//, '')}</span>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="shrink-0 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
