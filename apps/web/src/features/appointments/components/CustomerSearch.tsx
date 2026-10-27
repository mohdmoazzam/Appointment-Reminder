import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { controlStyles } from '@/components/ui/field-styles';
import { Spinner } from '@/components/ui/Spinner';
import { MIN_CUSTOMER_SEARCH_LENGTH, useCustomerSearch } from '@/features/customers/queries';
import { fullName } from '@/lib/names';
import type { Customer } from '@/types/models';

interface CustomerSearchProps {
  /** The chosen customer, or null. */
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  error?: string;
}

/** Find a returning customer by name or phone; shows the choice with a "Change" button. */
export function CustomerSearch({ value, onChange, error }: CustomerSearchProps) {
  const inputId = useId();
  const [search, setSearch] = useState('');
  const searchQuery = useCustomerSearch(search);
  const results = searchQuery.data?.data ?? [];
  const searching = search.trim().length >= MIN_CUSTOMER_SEARCH_LENGTH;

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="min-w-0 text-sm">
          <p className="font-medium text-slate-900">{fullName(value)}</p>
          <p className="truncate text-slate-500">
            {value.phone}
            {value.email && ` · ${value.email}`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        Search customers
      </label>
      <input
        id={inputId}
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Name or phone number"
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        className={controlStyles(Boolean(error))}
      />
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      {searching && (
        <div className="rounded-md border border-slate-200">
          {searchQuery.isFetching && results.length === 0 ? (
            <p className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
              <Spinner size="sm" label={null} /> Searching…
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">
              No customers match. Switch to “New customer” to add them.
            </p>
          ) : (
            <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto">
              {results.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => onChange(customer)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                  >
                    <span className="font-medium text-slate-900">{fullName(customer)}</span>
                    <span className="ml-2 text-slate-500">{customer.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
