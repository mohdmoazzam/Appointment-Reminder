import { paths } from '@/app/paths';
import { buttonStyles } from '@/components/ui/button-styles';
import { CopyField } from '@/components/ui/CopyField';
import { SettingsSection } from '@/components/ui/SettingsSection';

const WHAT_CUSTOMERS_SEE = [
  'Your active services that at least one person offers',
  'Only free times, from working hours, minus breaks, time off, closures and bookings',
  'Bookings from today up to 60 days ahead',
];

/** The shareable online booking link and what the page offers. */
export function BookingPagePanel({ slug }: { slug: string }) {
  const bookingUrl = `${window.location.origin}${paths.publicBooking(slug)}`;

  return (
    <div className="space-y-8">
      <SettingsSection
        title="Your booking link"
        description="Share it on WhatsApp, Instagram or Google Maps so customers can book without calling."
      >
        <CopyField label="Booking link" value={bookingUrl} />
        <a href={bookingUrl} target="_blank" rel="noreferrer" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
          Open booking page
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
            <path d="M11 3a1 1 0 1 0 0 2h2.59l-6.3 6.3a1 1 0 1 0 1.42 1.4L15 6.42V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z" />
            <path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 0 0 0-2H5Z" />
          </svg>
        </a>
      </SettingsSection>

      <SettingsSection title="What customers see" description="Set these up and the page follows automatically.">
        <ul className="space-y-2.5">
          {WHAT_CUSTOMERS_SEE.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm text-slate-700">
              <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                  clipRule="evenodd"
                />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </SettingsSection>
    </div>
  );
}
