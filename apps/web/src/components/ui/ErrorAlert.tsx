import { getErrorMessages } from '@/lib/api/api-error';
import { Alert } from './Alert';

interface ErrorAlertProps {
  /** Anything thrown, typically a mutation's or query's `error`. Renders nothing when null. */
  error: unknown;
  title?: string;
  className?: string;
}

/** Shows the messages of an ApiError (several for validation errors) as an error alert. */
export function ErrorAlert({ error, title, className }: ErrorAlertProps) {
  if (!error) return null;

  const messages = getErrorMessages(error);
  return (
    <Alert tone="error" title={title} className={className}>
      {messages.length === 1 ? (
        <p>{messages[0]}</p>
      ) : (
        <ul className="list-inside list-disc space-y-0.5">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </Alert>
  );
}
