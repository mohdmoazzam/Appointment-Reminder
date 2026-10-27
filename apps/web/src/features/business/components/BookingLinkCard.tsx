import { paths } from '@/app/paths';
import { buttonStyles } from '@/components/ui/button-styles';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { CopyField } from '@/components/ui/CopyField';

/** The business's shareable online booking link, e.g. for WhatsApp, Instagram or Google Maps. */
export function BookingLinkCard({ slug }: { slug: string }) {
  const bookingUrl = `${window.location.origin}${paths.publicBooking(slug)}`;

  return (
    <Card>
      <CardHeader
        title="Online booking page"
        description="Share this link so customers can book without calling. It shows active services that someone offers, and only free times."
      />
      <CardBody className="space-y-3">
        <CopyField label="Booking link" value={bookingUrl} />
        <a
          href={bookingUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonStyles({ variant: 'secondary', size: 'sm' })}
        >
          Open booking page
        </a>
      </CardBody>
    </Card>
  );
}
