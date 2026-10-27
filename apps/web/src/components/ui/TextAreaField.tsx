import { useId, type ComponentProps, type ReactNode } from 'react';
import { Field } from './Field';
import { controlStyles, describedBy, fieldIds } from './field-styles';

interface TextAreaFieldProps extends Omit<ComponentProps<'textarea'>, 'className'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
}

/** A labelled <textarea>; works with react-hook-form the same way as TextField. */
export function TextAreaField({
  label,
  hint,
  error,
  optional,
  className,
  id,
  rows = 3,
  ...textareaProps
}: TextAreaFieldProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <Field
      label={label}
      controlId={textareaId}
      hint={hint}
      error={error}
      optional={optional}
      className={className}
    >
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldIds(textareaId), hint, error)}
        className={controlStyles(Boolean(error))}
        {...textareaProps}
      />
    </Field>
  );
}
