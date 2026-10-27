import { useId, type ComponentProps, type ReactNode } from 'react';
import { Field } from './Field';
import { controlStyles, describedBy, fieldIds } from './field-styles';

interface TextFieldProps extends Omit<ComponentProps<'input'>, 'className'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
}

/**
 * A labelled <input>. Works with react-hook-form: <TextField label="Email" {...register('email')} />
 * (the `ref` from register is forwarded because React 19 passes ref as a regular prop).
 */
export function TextField({
  label,
  hint,
  error,
  optional,
  className,
  id,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <Field
      label={label}
      controlId={inputId}
      hint={hint}
      error={error}
      optional={optional}
      className={className}
    >
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldIds(inputId), hint, error)}
        className={controlStyles(Boolean(error))}
        {...inputProps}
      />
    </Field>
  );
}
