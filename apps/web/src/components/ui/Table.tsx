import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/*
 * Styled table elements. They render plain <table> markup, so screen readers and browser
 * tools treat them as an ordinary table. The wrapper scrolls sideways on narrow screens.
 */

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('min-w-full divide-y divide-slate-200 text-sm', className)} {...props} />
    </div>
  );
}

export function TableHead(props: ComponentProps<'thead'>) {
  return <thead className="bg-slate-50" {...props} />;
}

export function TableBody(props: ComponentProps<'tbody'>) {
  return <tbody className="divide-y divide-slate-100 bg-white" {...props} />;
}

export function TableHeaderCell({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn(
        'px-5 py-2.5 text-left text-xs font-medium tracking-wide whitespace-nowrap text-slate-500 uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-5 py-3 align-middle text-slate-700', className)} {...props} />;
}
