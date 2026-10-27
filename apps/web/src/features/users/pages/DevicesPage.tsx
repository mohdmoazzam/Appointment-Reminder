import { PageHeader } from '@/components/ui/PageHeader';
import { useDocumentTitle } from '@/lib/hooks/use-document-title';
import { SessionsCard } from '../components/SessionsCard';

/** The devices you're signed in on (`/account/devices`), opened from the profile menu. */
export function DevicesPage() {
  useDocumentTitle('Signed-in devices');

  return (
    <>
      <PageHeader
        title="Signed-in devices"
        description="Everywhere your account is signed in. Sign out of devices you don't recognise or no longer use."
      />
      <SessionsCard />
    </>
  );
}
