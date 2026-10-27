import { useEffect, useId, useState } from 'react';
import { Button } from './Button';
import { controlStyles } from './field-styles';

const COPIED_FEEDBACK_MS = 2000;

interface CopyFieldProps {
  label: string;
  value: string;
}

/** A read-only text box with a Copy button, e.g. for an invite link. */
export function CopyField({ label, value }: CopyFieldProps) {
  const inputId = useId();
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
      // Clipboard access can be denied (or unavailable over plain http); the text can still be
      // selected and copied by hand.
      setCopyState('failed');
    }
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          readOnly
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          className={controlStyles(false)}
        />
        <Button variant="secondary" onClick={copy} className="shrink-0">
          {copyState === 'copied' ? 'Copied' : 'Copy'}
        </Button>
      </div>
      {copyState === 'failed' && (
        <p className="text-xs text-red-600">
          Couldn&apos;t copy automatically. Select the link and copy it.
        </p>
      )}
    </div>
  );
}
