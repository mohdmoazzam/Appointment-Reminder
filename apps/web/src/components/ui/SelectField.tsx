import { useId, type ComponentProps, type ReactNode } from 'react';
import { Field } from './Field';
import { controlStyles, describedBy, fieldIds } from './field-styles';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends Omit<ComponentProps<'select'>, 'className' | 'children'> {
  label: string;
  options: readonly SelectOption[];
  /** Shown as a first, empty option, e.g. "Select a type". */
  placeholder?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
}

/** A labelled <select>. Works with react-hook-form the same way as TextField. */
export function SelectField({
  label,
  options,
  placeholder,
  hint,
  error,
  optional,
  className,
  id,
  ...selectProps
}: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <Field
      label={label}
      controlId={selectId}
      hint={hint}
      error={error}
      optional={optional}
      className={className}
    >
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldIds(selectId), hint, error)}
        className={controlStyles(Boolean(error))}
        {...selectProps}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
