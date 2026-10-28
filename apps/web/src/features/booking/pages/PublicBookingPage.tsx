import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { Alert } from '@/components/ui/Alert';
import { ErrorBlock, FullPageSpinner, LoadingBlock } from '@/components/ui/QueryStatus';
import { ApiError, isApiErrorWithStatus } from '@/lib/api/api-error';
import { cn } from '@/lib/cn';
import { addDaysToDate, todayInTimeZone } from '@/lib/date';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import type { Slot } from '@/types/models';
import { BookingConfirmation } from '../components/BookingConfirmation';
import { BookingHero } from '../components/BookingHero';
import { BookingSteps, type BookingStep } from '../components/BookingSteps';
import { BookingSummary } from '../components/BookingSummary';
import { DetailsStep } from '../components/DetailsStep';
import { ServiceStep } from '../components/ServiceStep';
import { TimeStep } from '../components/TimeStep';
import { useBookPublicAppointment, usePublicBusiness, usePublicServices } from '../queries';
import type {
  BookingConfirmation as Confirmation,
  PublicBusiness,
  PublicService,
  PublicStaffMember,
} from '../types';

const STEP_TITLES: Record<BookingStep, string> = {
  service: 'What would you like to book?',
  time: 'Pick a time',
  details: 'Your details',
};

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
      <PageFrame>
        <main className="mx-auto max-w-lg px-4 py-16">
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
        </main>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <BookingHero business={businessQuery.data} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {servicesQuery.isPending ? (
          <LoadingBlock label="Loading services" />
        ) : servicesQuery.isError ? (
          <ErrorBlock
            error={servicesQuery.error}
            onRetry={() => void servicesQuery.refetch()}
            isRetrying={servicesQuery.isFetching}
          />
        ) : (
          <BookingFlow slug={slug} business={businessQuery.data} services={servicesQuery.data} />
        )}
      </main>
    </PageFrame>
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
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  /** Shown on the time step when the chosen time was taken by someone else meanwhile. */
  const [timeTakenNotice, setTimeTakenNotice] = useState<string | null>(null);
  const bookMutation = useBookPublicAppointment(slug);

  const step: BookingStep = !service ? 'service' : !slot ? 'time' : 'details';
  const staff = resolveStaff(service, staffId, slot);

  const goTo = (target: BookingStep) => {
    if (target === 'service') {
      setService(null);
      setStaffId('');
    }
    setSlot(null);
    bookMutation.reset();
  };

  const startOver = () => {
    goTo('service');
    setDate(today);
    setConfirmation(null);
    setTimeTakenNotice(null);
  };

  if (confirmation) {
    return (
      <BookingConfirmation
        confirmation={confirmation}
        business={business}
        onBookAnother={startOver}
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6">
        <BookingSteps current={step} onGoTo={goTo} />
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            {STEP_TITLES[step]}
          </h2>
          {step !== 'service' && (
            <button
              type="button"
              onClick={() => goTo(step === 'details' ? 'time' : 'service')}
              className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              ← Back
            </button>
          )}
        </div>

        {step === 'service' && (
          <ServiceStep
            services={services}
            currency={business.currency}
            onSelect={(chosen) => {
              setService(chosen);
              setStaffId('');
            }}
          />
        )}

        {step === 'time' && service && (
          <TimeStep
            slug={slug}
            service={service}
            staffId={staffId}
            onStaffChange={setStaffId}
            date={date}
            onDateChange={setDate}
            today={today}
            lastDay={lastDay}
            notice={timeTakenNotice}
            onSelect={(chosen) => {
              setTimeTakenNotice(null);
              setSlot(chosen);
            }}
          />
        )}

        {step === 'details' && service && slot && (
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
                      setTimeTakenNotice(error.message);
                      setSlot(null);
                      bookMutation.reset();
                    }
                  },
                },
              )
            }
          />
        )}
      </div>

      {/* On phones the summary only appears once there's something to summarise. */}
      <div className={cn('order-first lg:order-none', !service && 'hidden lg:block')}>
        <BookingSummary business={business} service={service} staff={staff} slot={slot} />
      </div>
    </div>
  );
}

/**
 * Who the customer will see, as far as it's already certain: the person they picked, the only
 * person offering the service, or the only person free at the chosen time. Null means several
 * people could take it ("Anyone available"); the confirmation then names who was booked.
 */
function resolveStaff(
  service: PublicService | null,
  staffId: string,
  slot: Slot | null,
): PublicStaffMember | null {
  if (!service) return null;
  const byId = (id: string | undefined) => service.staff.find((member) => member.id === id) ?? null;

  if (staffId) return byId(staffId);
  if (service.staff.length === 1) return service.staff[0]!;
  if (slot && slot.staff_ids.length === 1) return byId(slot.staff_ids[0]);
  return null;
}

/** Background and footer for the public page (no app navigation). */
function PageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex-1">{children}</div>
      <footer className="py-6 text-center text-xs text-slate-400">
        Powered by ShowUp
      </footer>
    </div>
  );
}
