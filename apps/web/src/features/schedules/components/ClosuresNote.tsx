import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { Alert } from '@/components/ui/Alert';

/** Reminds that business-wide holidays are managed in one place, not per person. */
export function ClosuresNote() {
  return (
    <Alert tone="info">
      Public holidays and other days the whole business is closed apply to everyone. Manage them in{' '}
      <Link to={paths.businessClosures} className="font-medium underline">
        Business settings
      </Link>
      .
    </Alert>
  );
}
