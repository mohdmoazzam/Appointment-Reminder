import type { PageMeta } from '@/types/api';
import { Button } from './Button';

interface PaginationProps {
  meta: PageMeta;
  onPageChange: (page: number) => void;
  /** Noun for the count, e.g. "members" → "12 members". */
  itemLabel?: string;
}

/** "Page 2 of 5 · 112 members" with Previous / Next. Hidden when everything fits on one page. */
export function Pagination({ meta, onPageChange, itemLabel = 'items' }: PaginationProps) {
  if (meta.pageCount <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3"
    >
      <p className="text-sm text-slate-500">
        Page {meta.page} of {meta.pageCount} · {meta.count} {itemLabel}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!meta.hasPreviousPage}
          onClick={() => onPageChange(meta.page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!meta.hasNextPage}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
