import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { DayStrip } from '@/components/ui/DayStrip';
import { ErrorBlock, FullPageSpinner } from '@/components/ui/QueryStatus';
import { SelectField } from '@/components/ui/SelectField';
import { SlotGrid } from '@/components/ui/SlotGrid';
import { ApiError, isApiErrorWithStatus } from '@/lib/api/api-error';
import {
  addDaysToDate,
  dateInZone,
  formatLongDate,
  formatTimeInZone,
  todayInTimeZone,
} from '@/lib/date';
import { formatDuration } from '@/lib/durations';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { formatPrice } from '@/lib/money';
import type { Slot } from '@/types/models';
import { BusinessHeader } from '../components/BusinessHeader';
import { DetailsStep } from '../components/DetailsStep';
import { ServiceStep } from '../components/ServiceStep';
import {
  useBookPublicAppointment,
  usePublicBusiness,
  usePublicServices,
  usePublicSlots,
} from '../queries';
import type { BookingConfirmation, PublicBusiness, PublicService } from '../types';

/**
 * The shareable booking page (/book/:slug). No login. The step shown follows from what has
 * been chosen: service → time (optionally a person) → details → confirmation.
 */
export function PublicBookingPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const businessQuery = usePublicBusiness(slug);
  const servicesQuery = usePublicServices(slug);
  useDocumentTitle(
    businessQuery.data ? `Book with ${businessQuery.data.name}` : 'Book an appointment',
  );

  if (businessQuery.isPending) return <FullPageSpinner />;
  if (businessQuery.isError) {
    return (
      <PublicShell>
        {isApiErrorWithStatus(businessQuery.error, 404) ? (
          <Alert tone="warning" title="Booking page not found">
            Check the link you were given, or contact the business directly.
          </Alert>
        ) : (
          <ErrorBlock
            error={businessQuery.error}
            onRetry={() => void businessQuery.refetch()}
            isRetrying={businessQuery.isFetching}
          />
        )}
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <BusinessHeader business={businessQuery.data} />
      <div className="mt-8">
        {servicesQuery.isPending ? (
          <FullPageSpinner />
        ) : servicesQuery.isError ? (
          <ErrorBlock
            error={servicesQuery.error}
            onRetry={() => void servicesQuery.refetch()}
            isRetrying={servicesQuery.isFetching}
          />
        ) : (
          <BookingFlow slug={slug} business={businessQuery.data} services={servicesQuery.data} />
        )}
      </div>
    </PublicShell>
  );
}

interface BookingFlowProps {
  slug: string;
  business: PublicBusiness;
  services: PublicService[];
}

function BookingFlow({ slug, business, services }: BookingFlowProps) {
  const today = todayInTimeZone(business.timezone);
  const lastDay = addDaysToDate(today, business.booking_window_days);

  const [service, setService] = useState<PublicService | null>(null);
  /** '' means anyone available. */
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  /** Shown on the time step when the chosen time was taken by someone else meanwhile. */
  const [timeTakenMessage, setTimeTakenMessage] = useState<string | null>(null);

  const slotsQuery = usePublicSlots(
    slug,
    service && !slot ? { service_id: service.id, date, staff_id: staffId || undefined } : null,
  );
  const bookMutation = useBookPublicAppointment(slug);

  const startOver = () => {
    setService(null);
    setStaffId('');
    setDate(today);
    setSlot(null);
    setConfirmation(null);
    setTimeTakenMessage(null);
    bookMutation.reset();
  };

  // --- Done ---
  if (confirmation) {
    return (
      <Confirmation confirmation={confirmation} business={business} onBookAnother={startOver} />
    );
  }

  // --- Step 1: service ---
  if (!service) {
    return (
      <Step number={1} title="Choose a service">
        <ServiceStep services={services} currency={business.currency} onSelect={setService} />
      </Step>
    );
  }

  const summary = (
    <Summary
      service={service}
      business={business}
      slot={slot}
      onChangeService={() => {
        setService(null);
        setStaffId('');
        setSlot(null);
      }}
      onChangeTime={slot ? () => setSlot(null) : undefined}
    />
  );

  // --- Step 2: time ---
  if (!slot) {
    return (
      <Step number={2} title="Pick a time" summary={summary}>
        <div className="space-y-5">
          {timeTakenMessage && <Alert tone="warning">{timeTakenMessage}</Alert>}
          {service.staff.length > 1 && (
            <SelectField
              label="With"
              value={staffId}
              onChange={(event) => setStaffId(event.target.value)}
              options={[
                { value: '', label: 'Anyone available' },
                ...service.staff.map((member) => ({
                  value: member.id,
                  label: `${member.first_name} ${member.last_name}`,
                })),
              ]}
            />
          )}
          <DayStrip value={date} onChange={setDate} min={today} max={lastDay} today={today} />
          <SlotGrid
            slots={slotsQuery.data}
            isLoading={slotsQuery.isFetching && !slotsQuery.data}
            error={slotsQuery.error}
            value=""
            onChange={(chosen) => {
              setTimeTakenMessage(null);
              setSlot(chosen);
            }}
            emptyMessage="No free times on this day. Please try another date."
          />
          <p className="text-xs text-slate-500">
            Times are in {business.timezone.replaceAll('_', ' ')}.
          </p>
        </div>
      </Step>
    );
  }

  // --- Step 3: details ---
  return (
    <Step number={3} title="Your details" summary={summary}>
      <DetailsStep
        isSubmitting={bookMutation.isPending}
        submitError={bookMutation.error}
        onSubmit={({ customer, notes }) =>
          bookMutation.mutate(
            {
              service_id: service.id,
              staff_id: staffId || undefined,
              starts_at: slot.starts_at,
              customer,
              notes,
            },
            {
              onSuccess: setConfirmation,
              onError: (error) => {
                // 409: someone else took the time. Send the customer back to choose again.
                if (error instanceof ApiError && error.status === 409) {
                  setTimeTakenMessage(error.message);
                  setSlot(null);
                  bookMutation.reset();
                }
              },
            },
          )
        }
      />
    </Step>
  );
}

function Step({
  number,
  title,
  summary,
  children,
}: {
  number: number;
  title: string;
  summary?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      {summary}
      <h2 className="text-lg font-semibold text-slate-900">
        <span className="mr-2 text-slate-400">{number}.</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

interface SummaryProps {
  service: PublicService;
  business: PublicBusiness;
  slot: Slot | null;
  onChangeService: () => void;
  onChangeTime?: () => void;
}

/** What has been chosen so far, with links back to earlier steps. */
function Summary({ service, business, slot, onChangeService, onChangeTime }: SummaryProps) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p>
          <span className="font-medium text-slate-900">{service.name}</span>
          <span className="text-slate-500">
            {' '}
            · {formatDuration(service.duration_minutes)} ·{' '}
            {formatPrice(service.price, business.currency)}
          </span>
        </p>
        <Button variant="ghost" size="sm" onClick={onChangeService}>
          Change
        </Button>
      </div>
      {slot && onChangeTime && (
        <div className="flex items-start justify-between gap-3 border-t border-slate-100 pt-2">
          <p className="font-medium text-slate-900">
            {formatLongDate(dateInZone(slot.starts_at, business.timezone))} at{' '}
            {formatTimeInZone(slot.starts_at, business.timezone)}
          </p>
          <Button variant="ghost" size="sm" onClick={onChangeTime}>
            Change
          </Button>
        </div>
      )}
    </div>
  );
}

interface ConfirmationProps {
  confirmation: BookingConfirmation;
  business: PublicBusiness;
  onBookAnother: () => void;
}

function Confirmation({ confirmation, business, onBookAnother }: ConfirmationProps) {
  const timeZone = business.timezone;
  return (
    <section className="space-y-5">
      <Alert tone="success" title={`You're booked, ${confirmation.customer.first_name}!`}>
        We look forward to seeing you.
      </Alert>
      <dl className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">When</dt>
          <dd className="font-medium text-slate-900">
            {formatLongDate(dateInZone(confirmation.starts_at, timeZone))}
            <br />
            {formatTimeInZone(confirmation.starts_at, timeZone)} –{' '}
            {formatTimeInZone(confirmation.ends_at, timeZone)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">What</dt>
          <dd className="font-medium text-slate-900">
            {confirmation.service.name} with {confirmation.staff.first_name}{' '}
            {confirmation.staff.last_name}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Price</dt>
          <dd className="font-medium text-slate-900">
            {formatPrice(confirmation.price, business.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Need to change it?</dt>
          <dd className="text-slate-900">
            {business.phone ? (
              <>
                Call us on{' '}
                <a href={`tel:${business.phone}`} className="text-brand-600 hover:text-brand-700">
                  {business.phone}
                </a>
              </>
            ) : (
              'Contact the business directly.'
            )}
          </dd>
        </div>
      </dl>
      <Button variant="secondary" onClick={onBookAnother}>
        Book another appointment
      </Button>
    </section>
  );
}

/** Page frame for the public booking page (no app navigation). */
function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
      <footer className="pb-8 text-center text-xs text-slate-400">
        Powered by Appointment Reminder
      </footer>
    </div>
  );
}
