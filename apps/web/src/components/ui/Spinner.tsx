import { cn } from '@/lib/cn';

type SpinnerSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-10 border-[3px]',
};

interface SpinnerProps {
  size?: SpinnerSize;
  /** Read by screen readers. Pass null when the spinner sits next to visible text. */
  label?: string | null;
  className?: string;
}

export function Spinner({ size = 'md', label = 'Loading', className }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
      className={cn(
        'inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent',
        SIZE_CLASSES[size],
        className,
      )}
    />
  );
}
