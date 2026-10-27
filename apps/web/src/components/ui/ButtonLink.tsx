import { Link, type LinkProps } from 'react-router';
import { buttonStyles, type ButtonSize, type ButtonVariant } from './button-styles';

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** A router link styled like a Button. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...linkProps
}: ButtonLinkProps) {
  return <Link className={buttonStyles({ variant, size, className })} {...linkProps} />;
}
